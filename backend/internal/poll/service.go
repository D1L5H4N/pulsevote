package poll

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/pulsevote/backend/internal/activity"
	redisutil "github.com/pulsevote/backend/internal/redis"
)

// Sentinel errors for type-safe error handling by callers.
var (
	ErrPollNotFound    = errors.New("poll not found")
	ErrNotOwner        = errors.New("you do not own this poll")
	ErrDuplicateOption = errors.New("poll options must be unique (case-insensitive)")
	ErrPollClosed      = errors.New("this poll is no longer accepting votes")
	ErrExpiredTime     = errors.New("expiry time must be in the future")
)

// VoteAnalyticsProvider abstracts vote queries required for dashboard analytics and export.
type VoteAnalyticsProvider interface {
	TotalForPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error)
	TotalParticipantsForPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error)
	GetDeviceAnalytics(ctx context.Context, pollIDs []primitive.ObjectID) (int64, int64, int64, error)
	GetGeoAnalytics(ctx context.Context, pollIDs []primitive.ObjectID) ([]GeoItem, error)
	GetTimelineForPolls(ctx context.Context, pollIDs []primitive.ObjectID) ([]DashboardTimelinePoint, error)
	TotalForPoll(ctx context.Context, pollID primitive.ObjectID) (int64, error)
	GetExportRows(ctx context.Context, pollID primitive.ObjectID) ([]ExportVoteRow, error)
}

// Service contains all poll business logic.
// It depends on Repository for persistence and does not touch HTTP concerns.
type Service struct {
	repo         *Repository
	redis        *goredis.Client
	voteProvider VoteAnalyticsProvider
	activity     *activity.Service
}

// NewService constructs a poll Service.
func NewService(repo *Repository, redis *goredis.Client, voteProvider VoteAnalyticsProvider, act *activity.Service) *Service {
	return &Service{
		repo:         repo,
		redis:        redis,
		voteProvider: voteProvider,
		activity:     act,
	}
}

// Create validates and persists a new poll.
//
// Ownership is established from the JWT-extracted creatorID, never from the
// request body - the client cannot forge ownership.
func (s *Service) Create(ctx context.Context, creatorID string, req *CreatePollRequest) (*Poll, error) {
	// Validate unique options before any DB call (cheap CPU operation first)
	if err := validateUniqueOptions(req.Options); err != nil {
		return nil, err
	}

	if req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now().UTC()) {
		return nil, ErrExpiredTime
	}

	ownerID, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, errors.New("invalid creator ID")
	}

	p := &Poll{
		CreatorID: ownerID,
		Question:  strings.TrimSpace(req.Question),
		Options:   normalizeOptions(req.Options),
		Status:    StatusActive,
		ExpiresAt: req.ExpiresAt,
	}

	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}

	if p.ExpiresAt != nil {
		s.scheduleAutoExpire(p.ID.Hex(), *p.ExpiresAt)
	}

	// Record activity
	if s.activity != nil {
		s.activity.RecordActivity(ctx, p.CreatorID, p.ID, p.Question, "create", fmt.Sprintf("Poll \"%s\" was created", p.Question))
	}

	return p, nil
}

// GetByID retrieves a poll and lazily transitions it to "expired" if needed.
//
// Lazy expiration: rather than running a background cron, we mark a poll
// expired the first time it is fetched after its deadline. This is simpler
// and sufficient for an application at this scale.
func (s *Service) GetByID(ctx context.Context, id string) (*Poll, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrPollNotFound
	}

	p, err := s.repo.FindByID(ctx, oid)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrPollNotFound
		}
		return nil, err
	}

	s.lazyExpire(p)
	return p, nil
}

// ListByCreator returns all polls belonging to the given user.
func (s *Service) ListByCreator(ctx context.Context, creatorID string) ([]*Poll, error) {
	oid, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, errors.New("invalid creator ID")
	}

	polls, err := s.repo.FindByCreator(ctx, oid)
	if err != nil {
		return nil, err
	}

	for _, p := range polls {
		s.lazyExpire(p)
	}
	return polls, nil
}

// Close allows only the creator to manually close their poll.
// Ownership is enforced here in the service layer, not just at the HTTP layer.
func (s *Service) Close(ctx context.Context, pollID, requestingUserID string) error {
	p, err := s.GetByID(ctx, pollID)
	if err != nil {
		return err
	}
	if p.CreatorID.Hex() != requestingUserID {
		return ErrNotOwner
	}
	oid, _ := primitive.ObjectIDFromHex(pollID)
	if err := s.repo.UpdateStatus(ctx, oid, StatusClosed); err != nil {
		return err
	}

	// Broadcast status change to all connected WebSocket clients
	s.broadcastPollStatus(pollID, StatusClosed, p.ExpiresAt)

	// Record activity
	if s.activity != nil {
		s.activity.RecordActivity(ctx, p.CreatorID, p.ID, p.Question, "close", fmt.Sprintf("Poll \"%s\" was closed", p.Question))
	}

	return nil
}

// Open allows only the creator to open or reopen their poll, optionally updating the expiry.
func (s *Service) Open(ctx context.Context, pollID, requestingUserID string, newExpiresAt *time.Time) error {
	p, err := s.GetByID(ctx, pollID)
	if err != nil {
		return err
	}
	if p.CreatorID.Hex() != requestingUserID {
		return ErrNotOwner
	}

	if newExpiresAt != nil && newExpiresAt.Before(time.Now().UTC()) {
		return ErrExpiredTime
	}

	oid, _ := primitive.ObjectIDFromHex(pollID)
	if err := s.repo.UpdateStatusAndExpiry(ctx, oid, StatusActive, newExpiresAt); err != nil {
		return err
	}

	p.Status = StatusActive
	p.ExpiresAt = newExpiresAt

	// Broadcast status change to all connected WebSocket clients
	s.broadcastPollStatus(pollID, StatusActive, newExpiresAt)

	// If new expiry is in the future, schedule auto-expiration
	if newExpiresAt != nil {
		s.scheduleAutoExpire(pollID, *newExpiresAt)
	}

	// Record activity
	if s.activity != nil {
		s.activity.RecordActivity(ctx, p.CreatorID, p.ID, p.Question, "reopen", fmt.Sprintf("Poll \"%s\" was reopened", p.Question))
	}

	return nil
}

// Duplicate clones a poll and resets its vote counts and status to active.
func (s *Service) Duplicate(ctx context.Context, pollID, requestingUserID string) (*Poll, error) {
	p, err := s.GetByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if p.CreatorID.Hex() != requestingUserID {
		return nil, ErrNotOwner
	}
	userOid, _ := primitive.ObjectIDFromHex(requestingUserID)
	clone, err := s.repo.Duplicate(ctx, p.ID, userOid)
	if err != nil {
		return nil, err
	}

	if s.activity != nil {
		s.activity.RecordActivity(ctx, clone.CreatorID, clone.ID, clone.Question, "create", fmt.Sprintf("Duplicated poll as \"%s\"", clone.Question))
	}
	return clone, nil
}

// ExportCSV creates a formatted CSV export string for a poll.
func (s *Service) ExportCSV(ctx context.Context, pollID, requestingUserID string) (string, error) {
	p, err := s.GetByID(ctx, pollID)
	if err != nil {
		return "", err
	}
	if p.CreatorID.Hex() != requestingUserID {
		return "", ErrNotOwner
	}

	rows := []ExportVoteRow{}
	if s.voteProvider != nil {
		r, err := s.voteProvider.GetExportRows(ctx, p.ID)
		if err == nil {
			rows = r
		}
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# Poll Title: \"%s\"\n", p.Question))
	sb.WriteString(fmt.Sprintf("# Status: %s\n", p.Status))
	sb.WriteString(fmt.Sprintf("# Created At: %s\n", p.CreatedAt.Format(time.RFC3339)))
	sb.WriteString(fmt.Sprintf("# Total Votes: %d\n\n", len(rows)))
	sb.WriteString("Vote Timestamp,Option Index,Option Name,Device,Country\n")

	for _, row := range rows {
		optName := "Unknown"
		if row.OptionIndex >= 0 && row.OptionIndex < len(p.Options) {
			optName = p.Options[row.OptionIndex]
		}
		optName = strings.ReplaceAll(optName, "\"", "\"\"")
		sb.WriteString(fmt.Sprintf("%s,%d,\"%s\",%s,%s\n",
			row.CreatedAt.Format(time.RFC3339),
			row.OptionIndex,
			optName,
			row.Device,
			row.Country,
		))
	}

	return sb.String(), nil
}

// IncrementViews atomically increments view counts for a poll.
func (s *Service) IncrementViews(ctx context.Context, pollID string) {
	if s.redis != nil {
		s.redis.Incr(ctx, redisutil.ViewsKey(pollID))
	}
	oid, err := primitive.ObjectIDFromHex(pollID)
	if err == nil {
		go func() {
			_ = s.repo.IncrementViews(context.Background(), oid)
		}()
	}
}

// Delete removes a poll, enforcing that only the creator may do so.
func (s *Service) Delete(ctx context.Context, pollID, requestingUserID string) error {
	p, err := s.GetByID(ctx, pollID)
	if err != nil {
		return err
	}
	if p.CreatorID.Hex() != requestingUserID {
		return ErrNotOwner
	}
	oid, _ := primitive.ObjectIDFromHex(pollID)
	return s.repo.Delete(ctx, oid)
}

// GetDashboardStats returns legacy summary counts or full dashboard response.
func (s *Service) GetDashboardStats(ctx context.Context, creatorID string) (*DashboardResponse, error) {
	return s.GetFullDashboard(ctx, creatorID)
}

// GetFullDashboard aggregates all SaaS dashboard metrics, widgets, analytics, and activities.
func (s *Service) GetFullDashboard(ctx context.Context, creatorID string) (*DashboardResponse, error) {
	oid, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, errors.New("invalid creator ID")
	}

	polls, err := s.repo.FindByCreator(ctx, oid)
	if err != nil {
		return nil, err
	}

	for _, p := range polls {
		s.lazyExpire(p)
	}

	pollIDs := make([]primitive.ObjectID, len(polls))
	var activeCount, closedCount, expiredCount, scheduledCount int64
	var totalLiveViewers int64

	analyticsItems := make([]PollAnalyticsItem, 0, len(polls))

	for i, p := range polls {
		pollIDs[i] = p.ID
		switch p.Status {
		case StatusActive:
			activeCount++
		case StatusClosed:
			closedCount++
		case StatusExpired:
			expiredCount++
		case StatusScheduled:
			scheduledCount++
		}

		// Read live viewers from Redis
		var viewers int64
		if s.redis != nil {
			val, _ := s.redis.Get(ctx, redisutil.PresenceKey(p.ID.Hex())).Int64()
			viewers = val
			if p.Status == StatusActive {
				totalLiveViewers += viewers
			}
		}

		// Read views count from Redis or model
		var views int64 = p.Views
		if s.redis != nil {
			if rViews, err := s.redis.Get(ctx, redisutil.ViewsKey(p.ID.Hex())).Int64(); err == nil && rViews > views {
				views = rViews
			}
		}

		// Read votes for this poll
		var votes int64
		if s.voteProvider != nil {
			v, err := s.voteProvider.TotalForPoll(ctx, p.ID)
			if err == nil {
				votes = v
			}
		}

		// Calculate participation rate
		maxImp := views
		if votes > maxImp {
			maxImp = votes
		}
		if maxImp == 0 {
			maxImp = 1
		}
		participationRate := float64(votes) / float64(maxImp) * 100.0
		if participationRate > 100.0 {
			participationRate = 100.0
		}

		// 0 to 100 engagement score
		score := 0.0
		if views > 0 || votes > 0 {
			ratePart := (participationRate / 100.0) * 60.0
			volumePart := (float64(votes) / 50.0) * 40.0
			if volumePart > 40.0 {
				volumePart = 40.0
			}
			score = math.Min(100.0, math.Max(0.0, ratePart+volumePart))
		}

		analyticsItems = append(analyticsItems, PollAnalyticsItem{
			ID:                p.ID.Hex(),
			Question:          p.Question,
			Options:           p.Options,
			Status:            p.Status,
			CreatedAt:         p.CreatedAt,
			ExpiresAt:         p.ExpiresAt,
			Votes:             votes,
			Views:             views,
			Participants:      votes,
			ParticipationRate: math.Round(participationRate*10) / 10,
			EngagementScore:   math.Round(score*10) / 10,
		})
	}

	// Calculate totals
	var totalVotes, totalParticipants int64
	var deviceMobile, deviceDesktop, deviceTablet int64
	geoItems := []GeoItem{}
	timeline := []DashboardTimelinePoint{}

	if s.voteProvider != nil && len(pollIDs) > 0 {
		totalVotes, _ = s.voteProvider.TotalForPolls(ctx, pollIDs)
		totalParticipants, _ = s.voteProvider.TotalParticipantsForPolls(ctx, pollIDs)
		deviceMobile, deviceDesktop, deviceTablet, _ = s.voteProvider.GetDeviceAnalytics(ctx, pollIDs)
		geoItems, _ = s.voteProvider.GetGeoAnalytics(ctx, pollIDs)
		timeline, _ = s.voteProvider.GetTimelineForPolls(ctx, pollIDs)
	}

	// Device percentages
	totalDev := deviceMobile + deviceDesktop + deviceTablet
	var mobPct, dskPct, tabPct float64
	if totalDev > 0 {
		mobPct = math.Round((float64(deviceMobile)/float64(totalDev)*100)*10) / 10
		dskPct = math.Round((float64(deviceDesktop)/float64(totalDev)*100)*10) / 10
		tabPct = math.Round((float64(deviceTablet)/float64(totalDev)*100)*10) / 10
	}

	// Popular Polls: top 5 by votes
	popular := make([]PollAnalyticsItem, len(analyticsItems))
	copy(popular, analyticsItems)
	sort.Slice(popular, func(i, j int) bool {
		return popular[i].Votes > popular[j].Votes
	})
	if len(popular) > 5 {
		popular = popular[:5]
	}

	// Calculate average engagement score across polls
	var totalEngagement float64
	for _, item := range analyticsItems {
		totalEngagement += item.EngagementScore
	}
	avgEngagement := 0.0
	if len(analyticsItems) > 0 {
		avgEngagement = math.Round((totalEngagement/float64(len(analyticsItems)))*10) / 10
	}

	// Total views
	var totalViews int64
	for _, item := range analyticsItems {
		totalViews += item.Views
	}

	// Recent Activities
	activities := []any{}
	if s.activity != nil {
		acts, err := s.activity.GetRecentActivities(ctx, oid, 15)
		if err == nil {
			for _, a := range acts {
				activities = append(activities, a)
			}
		}
	}

	resp := &DashboardResponse{
		Stats: DashboardStats{
			Total:             int64(len(polls)),
			Active:            activeCount,
			Closed:            closedCount,
			Expired:           expiredCount,
			Scheduled:         scheduledCount,
			TotalPolls:        int64(len(polls)),
			ActivePolls:       activeCount,
			ClosedPolls:       closedCount,
			TotalVotes:        totalVotes,
			TotalParticipants: totalParticipants,
			TotalViews:        totalViews,
			AvgEngagement:     avgEngagement,
		},
		Polls:            analyticsItems,
		PopularPolls:     popular,
		Devices: DeviceBreakdown{
			Mobile:     deviceMobile,
			Desktop:    deviceDesktop,
			Tablet:     deviceTablet,
			MobilePct:  mobPct,
			DesktopPct: dskPct,
			TabletPct:  tabPct,
		},
		Geography:        geoItems,
		Timeline:         timeline,
		RecentActivities: activities,
		LiveViewers:      totalLiveViewers,
	}

	return resp, nil
}

// lazyExpire checks if a poll should be marked expired and does so asynchronously.
// The in-memory status is updated immediately so the current request sees the
// correct state, while the database write happens in a background goroutine.
func (s *Service) lazyExpire(p *Poll) {
	if p.Status == StatusActive && p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
		p.Status = StatusExpired
		go func() {
			_ = s.repo.UpdateStatus(context.Background(), p.ID, StatusExpired)
			s.broadcastPollStatus(p.ID.Hex(), StatusExpired, p.ExpiresAt)
			if s.activity != nil {
				s.activity.RecordActivity(context.Background(), p.CreatorID, p.ID, p.Question, "expire", fmt.Sprintf("Poll \"%s\" has expired", p.Question))
			}
		}()
	}
}

// broadcastPollStatus sends a real-time status update to the poll's Redis channel.
func (s *Service) broadcastPollStatus(pollID string, status PollStatus, expiresAt *time.Time) {
	if s.redis == nil {
		return
	}
	payload := gin.H{
		"type":       "status_change",
		"poll_id":    pollID,
		"status":     status,
		"expires_at": expiresAt,
	}
	go func() {
		_ = redisutil.Publish(context.Background(), s.redis, pollID, payload)
	}()
}

// scheduleAutoExpire starts a goroutine timer to expire a poll when its deadline arrives.
func (s *Service) scheduleAutoExpire(pollID string, expiresAt time.Time) {
	duration := time.Until(expiresAt)
	if duration <= 0 {
		return
	}
	go func() {
		time.Sleep(duration)
		oid, err := primitive.ObjectIDFromHex(pollID)
		if err != nil {
			return
		}
		p, err := s.repo.FindByID(context.Background(), oid)
		if err != nil {
			return
		}
		if p.Status == StatusActive {
			_ = s.repo.UpdateStatus(context.Background(), oid, StatusExpired)
			s.broadcastPollStatus(pollID, StatusExpired, p.ExpiresAt)
			if s.activity != nil {
				s.activity.RecordActivity(context.Background(), p.CreatorID, p.ID, p.Question, "expire", fmt.Sprintf("Poll \"%s\" has expired", p.Question))
			}
		}
	}()
}

// validateUniqueOptions ensures no duplicate options exist (case-insensitive).
func validateUniqueOptions(options []string) error {
	seen := make(map[string]bool, len(options))
	for _, opt := range options {
		trimmed := strings.ToLower(strings.TrimSpace(opt))
		if seen[trimmed] {
			return ErrDuplicateOption
		}
		seen[trimmed] = true
	}
	return nil
}

// normalizeOptions trims whitespace from each option string.
func normalizeOptions(options []string) []string {
	clean := make([]string, len(options))
	for i, opt := range options {
		clean[i] = strings.TrimSpace(opt)
	}
	return clean
}
