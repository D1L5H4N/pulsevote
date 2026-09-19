package vote

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"strconv"

	goredis "github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/pulsevote/backend/internal/poll"
	redisutil "github.com/pulsevote/backend/internal/redis"
)

// Sentinel errors for handler-level error mapping.
var (
	ErrAlreadyVoted    = errors.New("you have already voted on this poll")
	ErrInvalidOption   = errors.New("invalid option index")
	ErrPollNotVotable  = errors.New("this poll is not accepting votes")
)

// Service orchestrates vote submission and result computation.
//
// Dependency structure:
//   - voteRepo: persist votes, check duplicates
//   - pollRepo:  fetch poll data (injected directly to avoid import cycles with poll.Service)
//   - redis:     counters (INCR/MGET) and Pub/Sub publishing
type Service struct {
	voteRepo *Repository
	pollRepo *poll.Repository
	redis    *goredis.Client
}

// NewService constructs a vote Service.
func NewService(voteRepo *Repository, pollRepo *poll.Repository, redis *goredis.Client) *Service {
	return &Service{voteRepo: voteRepo, pollRepo: pollRepo, redis: redis}
}

// Vote processes a single vote submission end-to-end:
//  1. Load poll from MongoDB and validate it accepts votes
//  2. Validate the option index is in range
//  3. Compute a voter fingerprint and check for duplicates
//  4. Persist the vote to MongoDB
//  5. Increment the Redis counter for this option
//  6. Compute current results (with Redis-first, MongoDB-fallback)
//  7. Publish results to the Redis Pub/Sub channel
//  8. Return the computed results to the handler
func (s *Service) Vote(
	ctx context.Context,
	pollID string,
	optionIndex int,
	clientIP, userAgent string,
) (*poll.ResultsResponse, error) {
	// 1. Load poll
	oid, err := primitive.ObjectIDFromHex(pollID)
	if err != nil {
		return nil, poll.ErrPollNotFound
	}
	p, err := s.pollRepo.FindByID(ctx, oid)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, poll.ErrPollNotFound
		}
		return nil, err
	}

	// 2. Check poll accepts votes (status + expiry)
	if !p.IsAcceptingVotes() {
		return nil, ErrPollNotVotable
	}

	// 3. Validate option index
	if optionIndex < 0 || optionIndex >= len(p.Options) {
		return nil, ErrInvalidOption
	}

	// 4. Fingerprint and duplicate check
	fingerprint := voterFingerprint(clientIP, userAgent)
	alreadyVoted, err := s.voteRepo.HasVoted(ctx, oid, fingerprint)
	if err != nil {
		return nil, err
	}
	if alreadyVoted {
		return nil, ErrAlreadyVoted
	}

	// 5. Persist vote to MongoDB (source of truth)
	v := &Vote{
		PollID:           oid,
		OptionIndex:      optionIndex,
		VoterFingerprint: fingerprint,
	}
	if err := s.voteRepo.Create(ctx, v); err != nil {
		// Handle race condition: concurrent duplicate vote (unique index violation)
		if mongo.IsDuplicateKeyError(err) {
			return nil, ErrAlreadyVoted
		}
		return nil, err
	}

	// 6. Increment Redis counter (best-effort; results still computed correctly)
	counterKey := redisutil.CounterKey(pollID, optionIndex)
	s.redis.Incr(ctx, counterKey)

	// 7. Compute results (Redis-first with MongoDB fallback)
	results, err := s.computeResults(ctx, p)
	if err != nil {
		return nil, err
	}

	// 8. Publish results to Redis Pub/Sub for WebSocket broadcast (non-blocking)
	go redisutil.Publish(context.Background(), s.redis, pollID, results)

	return results, nil
}

// GetResults returns current vote tallies for a poll.
// It implements a Redis-first strategy with automatic MongoDB fallback:
//
//   Redis present  → fast path, O(N options) MGET
//   Redis missing  → rebuild counters from MongoDB votes, restore to Redis
//
// This ensures results are always correct even after a Redis restart or
// cache eviction, while being fast under normal operation.
func (s *Service) GetResults(ctx context.Context, pollID string) (*poll.ResultsResponse, error) {
	oid, err := primitive.ObjectIDFromHex(pollID)
	if err != nil {
		return nil, poll.ErrPollNotFound
	}
	p, err := s.pollRepo.FindByID(ctx, oid)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, poll.ErrPollNotFound
		}
		return nil, err
	}
	return s.computeResults(ctx, p)
}

// computeResults builds a ResultsResponse by loading counts from Redis
// (or falling back to MongoDB) and calculating percentages.
func (s *Service) computeResults(ctx context.Context, p *poll.Poll) (*poll.ResultsResponse, error) {
	numOptions := len(p.Options)
	counts, err := s.getCountsFromRedis(ctx, p.ID.Hex(), numOptions)
	if err != nil || allZero(counts) {
		// Redis miss or all-zero (cold start after restart): rebuild from MongoDB
		counts, err = s.rebuildCountsFromMongo(ctx, p.ID, numOptions)
		if err != nil {
			return nil, err
		}
	}

	var total int64
	for _, c := range counts {
		total += c
	}

	results := make([]poll.OptionResult, numOptions)
	for i, option := range p.Options {
		pct := 0.0
		if total > 0 {
			pct = float64(counts[i]) / float64(total) * 100
		}
		results[i] = poll.OptionResult{
			Index:      i,
			Option:     option,
			Votes:      counts[i],
			Percentage: roundToTwo(pct),
		}
	}

	// Query presence count from Redis
	var totalViewers int64
	viewersVal, err := s.redis.Get(ctx, redisutil.PresenceKey(p.ID.Hex())).Int64()
	if err == nil && viewersVal > 0 {
		totalViewers = viewersVal
	}
	if totalViewers < total {
		totalViewers = total
	}

	observing := totalViewers - total
	if observing < 0 {
		observing = 0
	}

	return &poll.ResultsResponse{
		PollID:             p.ID.Hex(),
		Question:           p.Question,
		Status:             p.Status,
		Results:            results,
		Total:              total,
		ExpiresAt:          p.ExpiresAt,
		TotalViewers:       totalViewers,
		ActiveParticipants: total,
		Observing:          observing,
	}, nil
}

// GetTimeline returns chronological vote velocity data for a poll.
func (s *Service) GetTimeline(ctx context.Context, pollID string) ([]TimelinePoint, error) {
	oid, err := primitive.ObjectIDFromHex(pollID)
	if err != nil {
		return nil, poll.ErrPollNotFound
	}
	return s.voteRepo.GetTimeline(ctx, oid)
}

// getCountsFromRedis retrieves all option counters via MGET (a single round-trip).
func (s *Service) getCountsFromRedis(ctx context.Context, pollID string, numOptions int) ([]int64, error) {
	keys := make([]string, numOptions)
	for i := range keys {
		keys[i] = redisutil.CounterKey(pollID, i)
	}

	vals, err := s.redis.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	counts := make([]int64, numOptions)
	for i, v := range vals {
		if v != nil {
			n, _ := strconv.ParseInt(fmt.Sprintf("%v", v), 10, 64)
			counts[i] = n
		}
	}
	return counts, nil
}

// rebuildCountsFromMongo queries MongoDB for vote counts per option
// and restores the Redis counters so subsequent requests hit the fast path.
func (s *Service) rebuildCountsFromMongo(ctx context.Context, pollID primitive.ObjectID, numOptions int) ([]int64, error) {
	counts := make([]int64, numOptions)
	for i := range counts {
		count, err := s.voteRepo.CountByPollAndOption(ctx, pollID, i)
		if err != nil {
			return nil, err
		}
		counts[i] = count
		// Restore Redis counter (best-effort; fire-and-forget)
		go s.redis.Set(context.Background(), redisutil.CounterKey(pollID.Hex(), i), count, 0)
	}
	return counts, nil
}

// voterFingerprint generates a SHA-256 hash of the voter's IP and User-Agent.
// The hash is stored instead of the raw values for basic anonymization.
// Limitation: users on the same NAT share an IP; clearing cookies/UserAgent
// can bypass this. Documented in the README.
func voterFingerprint(ip, userAgent string) string {
	raw := fmt.Sprintf("%s|%s", ip, userAgent)
	hash := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// allZero returns true if all elements are zero (Redis cold-start signal).
func allZero(counts []int64) bool {
	for _, c := range counts {
		if c != 0 {
			return false
		}
	}
	return true
}

// roundToTwo rounds a float64 to two decimal places.
func roundToTwo(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
