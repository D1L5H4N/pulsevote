// Package poll handles poll creation, retrieval, and lifecycle management.
package poll

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PollStatus represents the lifecycle state of a poll.
//
// Three-state lifecycle (active → closed | expired):
//   - active:  the poll is open and accepting votes
//   - closed:  the creator manually stopped the poll
//   - expired: the poll's expiry time has passed
//
// Using a typed string (rather than a boolean) makes the API more expressive
// and simplifies adding future states without a breaking change.
type PollStatus string

const (
	StatusActive  PollStatus = "active"
	StatusClosed  PollStatus = "closed"
	StatusExpired PollStatus = "expired"
)

// Poll is the MongoDB document model for a poll.
type Poll struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID primitive.ObjectID `bson:"creator_id"    json:"creator_id"`
	Question  string             `bson:"question"      json:"question"`
	Options   []string           `bson:"options"       json:"options"`
	Status    PollStatus         `bson:"status"        json:"status"`
	ExpiresAt *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

// IsAcceptingVotes returns true only when the poll should accept new votes.
// Centralising this logic here ensures the same rule is enforced everywhere
// without duplicating conditionals across handlers and services.
func (p *Poll) IsAcceptingVotes() bool {
	if p.Status == StatusClosed || p.Status == StatusExpired {
		return false
	}
	if p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
		return false
	}
	return p.Status == StatusActive
}

// CreatePollRequest is the validated input for poll creation.
// Gin binding tags enforce constraints before the service layer is reached.
type CreatePollRequest struct {
	Question  string     `json:"question"   binding:"required,min=5,max=500"`
	Options   []string   `json:"options"    binding:"required,min=2,max=6,dive,required,min=1,max=200"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// PollResponse is the JSON representation returned to API consumers.
type PollResponse struct {
	ID        string     `json:"id"`
	CreatorID string     `json:"creator_id"`
	Question  string     `json:"question"`
	Options   []string   `json:"options"`
	Status    PollStatus `json:"status"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// ResultsResponse represents the computed vote tallies for a poll.
// It is the payload both returned by the REST API and broadcast over WebSocket.
type ResultsResponse struct {
	PollID   string         `json:"poll_id"`
	Question string         `json:"question"`
	Status   PollStatus     `json:"status"`
	Results  []OptionResult `json:"results"`
	Total    int64          `json:"total_votes"`
}

// OptionResult holds the tally for a single poll option.
type OptionResult struct {
	Index      int     `json:"index"`
	Option     string  `json:"option"`
	Votes      int64   `json:"votes"`
	Percentage float64 `json:"percentage"`
}

// ToPollResponse converts an internal Poll to the API response shape.
func ToPollResponse(p *Poll) PollResponse {
	return PollResponse{
		ID:        p.ID.Hex(),
		CreatorID: p.CreatorID.Hex(),
		Question:  p.Question,
		Options:   p.Options,
		Status:    p.Status,
		ExpiresAt: p.ExpiresAt,
		CreatedAt: p.CreatedAt,
	}
}
