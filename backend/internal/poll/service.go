package poll

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Sentinel errors for type-safe error handling by callers.
var (
	ErrPollNotFound    = errors.New("poll not found")
	ErrNotOwner        = errors.New("you do not own this poll")
	ErrDuplicateOption = errors.New("poll options must be unique (case-insensitive)")
	ErrPollClosed      = errors.New("this poll is no longer accepting votes")
	ErrExpiredTime     = errors.New("expiry time must be in the future")
)

// Service contains all poll business logic.
// It depends on Repository for persistence and does not touch HTTP concerns.
type Service struct {
	repo *Repository
}

// NewService constructs a poll Service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create validates and persists a new poll.
//
// Ownership is established from the JWT-extracted creatorID, never from the
// request body — the client cannot forge ownership.
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
	return s.repo.UpdateStatus(ctx, oid, StatusClosed)
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

// GetDashboardStats returns aggregate poll counts for the creator's dashboard.
func (s *Service) GetDashboardStats(ctx context.Context, creatorID string) (map[string]int64, error) {
	oid, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, errors.New("invalid creator ID")
	}

	total, err := s.repo.CountByCreator(ctx, oid, "")
	if err != nil {
		return nil, err
	}
	active, err := s.repo.CountByCreator(ctx, oid, StatusActive)
	if err != nil {
		return nil, err
	}
	closed, err := s.repo.CountByCreator(ctx, oid, StatusClosed)
	if err != nil {
		return nil, err
	}
	expired, err := s.repo.CountByCreator(ctx, oid, StatusExpired)
	if err != nil {
		return nil, err
	}

	return map[string]int64{
		"total":   total,
		"active":  active,
		"closed":  closed,
		"expired": expired,
	}, nil
}

// lazyExpire checks if a poll should be marked expired and does so asynchronously.
// The in-memory status is updated immediately so the current request sees the
// correct state, while the database write happens in a background goroutine.
func (s *Service) lazyExpire(p *Poll) {
	if p.Status == StatusActive && p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
		p.Status = StatusExpired
		go s.repo.UpdateStatus(context.Background(), p.ID, StatusExpired)
	}
}

// --- private helpers ---

// validateUniqueOptions rejects polls with duplicate options.
// Comparison is case-insensitive and trims whitespace to catch near-duplicates.
func validateUniqueOptions(options []string) error {
	seen := make(map[string]bool, len(options))
	for _, opt := range options {
		key := strings.ToLower(strings.TrimSpace(opt))
		if seen[key] {
			return ErrDuplicateOption
		}
		seen[key] = true
	}
	return nil
}

// normalizeOptions trims whitespace from each option.
func normalizeOptions(options []string) []string {
	normalized := make([]string, len(options))
	for i, o := range options {
		normalized[i] = strings.TrimSpace(o)
	}
	return normalized
}
