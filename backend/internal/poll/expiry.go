// Package poll - expiry.go
//
// Poll expiration logic is isolated here to keep it easy to find
// and to separate it from CRUD concerns in service.go.
package poll

import (
	"context"
	"time"
)

// ExpiryChecker is responsible for evaluating and persisting the expired
// status of polls whose deadline has passed.
//
// Design - lazy expiration:
//
//	Rather than running a background cron that scans all polls periodically,
//	we evaluate expiry the first time a poll is fetched after its deadline.
//	This approach:
//	  - Requires zero additional infrastructure (no scheduler, no cron job)
//	  - Is accurate enough for the use case (polls don't need millisecond precision)
//	  - Avoids thundering-herd problems from bulk status updates
//
//	The trade-off: a poll appears "active" in the database until it is fetched.
//	For a polling platform this is acceptable - the poll creator or a voter
//	will fetch the poll before the status matters.
type ExpiryChecker struct {
	repo *Repository
}

// NewExpiryChecker creates an ExpiryChecker with access to the poll repository.
func NewExpiryChecker(repo *Repository) *ExpiryChecker {
	return &ExpiryChecker{repo: repo}
}

// CheckAndExpire evaluates whether a poll has exceeded its expiry time.
// If it has, it updates the in-memory status immediately (so the current
// request sees the correct state) and persists the change asynchronously
// in a goroutine to avoid adding latency to the request path.
//
// Returns true if the poll was transitioned to expired.
func (e *ExpiryChecker) CheckAndExpire(p *Poll) bool {
	if p.Status != StatusActive {
		return false // already in a terminal state
	}
	if p.ExpiresAt == nil {
		return false // no expiry configured
	}
	if !time.Now().UTC().After(*p.ExpiresAt) {
		return false // not yet expired
	}

	// Update in-memory status synchronously (request sees correct state)
	p.Status = StatusExpired

	// Persist asynchronously - a goroutine is cheap and this path is non-critical
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := e.repo.UpdateStatus(ctx, p.ID, StatusExpired); err != nil {
			// Non-fatal: the poll will be marked expired again on next fetch
			_ = err
		}
	}()

	return true
}

// IsExpired is a pure function that checks whether a poll's expiry
// deadline has passed, without any side effects.
// Useful in contexts where we want to check without triggering a DB write.
func IsExpired(p *Poll) bool {
	if p.ExpiresAt == nil {
		return false
	}
	return time.Now().UTC().After(*p.ExpiresAt)
}
