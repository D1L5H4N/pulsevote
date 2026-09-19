// Package vote handles vote submission, duplicate prevention, Redis counters,
// real-time result computation, and Pub/Sub publishing.
package vote

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Vote is the MongoDB document model for an individual vote cast on a poll.
//
// VoterFingerprint stores a SHA-256 hash of (IP + "|" + UserAgent) rather than
// the raw IP, providing basic anonymization while still enabling duplicate
// detection. This is intentionally a lightweight heuristic, not enterprise-grade
// identity verification - documented as such in the README.
type Vote struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID           primitive.ObjectID `bson:"poll_id"       json:"poll_id"`
	OptionIndex      int                `bson:"option_index"  json:"option_index"`
	VoterFingerprint string             `bson:"voter_fingerprint" json:"-"` // never exposed
	Device           string             `bson:"device,omitempty"  json:"device,omitempty"`
	Country          string             `bson:"country,omitempty" json:"country,omitempty"`
	CreatedAt        time.Time          `bson:"created_at"    json:"created_at"`
}

// VoteRequest is the expected JSON body for POST /api/polls/:id/vote.
type VoteRequest struct {
	OptionIndex int `json:"option_index" binding:"min=0"`
}

// TimelinePoint represents vote activity aggregated over a time interval.
type TimelinePoint struct {
	Timestamp  string `json:"timestamp"`
	Votes      int64  `json:"votes"`
	Cumulative int64  `json:"cumulative"`
}
