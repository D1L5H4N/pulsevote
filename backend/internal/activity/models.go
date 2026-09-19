package activity

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Activity represents an event in the dashboard activity stream.
type Activity struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id"        json:"user_id"`
	PollID    primitive.ObjectID `bson:"poll_id"        json:"poll_id"`
	PollTitle string             `bson:"poll_title"     json:"poll_title"`
	Type      string             `bson:"type"           json:"type"` // vote, create, close, reopen, expire, join
	Message   string             `bson:"message"        json:"message"`
	CreatedAt time.Time          `bson:"created_at"     json:"created_at"`
}
