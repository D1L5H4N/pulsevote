package vote

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Repository handles MongoDB operations for the vote domain.
type Repository struct {
	collection *mongo.Collection
}

// NewRepository creates a Repository and sets up indexes for efficient queries.
func NewRepository(db *mongo.Database) *Repository {
	coll := db.Collection("votes")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		// Compound unique index to enforce one-vote-per-fingerprint-per-poll.
		// The database enforces this as a hard constraint even if application logic fails.
		{
			Keys:    bson.D{{Key: "poll_id", Value: 1}, {Key: "voter_fingerprint", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		// Index for counting votes by poll and option (used in results rebuild)
		{Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "option_index", Value: 1}}},
	}

	if _, err := coll.Indexes().CreateMany(ctx, indexes); err != nil {
		_ = err // non-fatal on restart
	}

	return &Repository{collection: coll}
}

// Create inserts a new vote document.
// Returns mongo.WriteException with IsDuplicateKeyError == true if the voter
// has already voted on this poll (enforced by the compound unique index).
func (r *Repository) Create(ctx context.Context, v *Vote) error {
	v.ID = primitive.NewObjectID()
	v.CreatedAt = time.Now().UTC()
	_, err := r.collection.InsertOne(ctx, v)
	return err
}

// HasVoted checks whether a fingerprint has already voted on a specific poll.
// Returns true if a vote document exists for this combination.
func (r *Repository) HasVoted(ctx context.Context, pollID primitive.ObjectID, fingerprint string) (bool, error) {
	filter := bson.M{"poll_id": pollID, "voter_fingerprint": fingerprint}
	count, err := r.collection.CountDocuments(ctx, filter, options.Count().SetLimit(1))
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CountByPollAndOption returns the total votes for a specific option on a poll.
// Used when rebuilding Redis counters from MongoDB (Redis cold-start / eviction).
func (r *Repository) CountByPollAndOption(ctx context.Context, pollID primitive.ObjectID, optionIndex int) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{
		"poll_id":      pollID,
		"option_index": optionIndex,
	})
}

// TotalForPoll returns the total number of votes cast on a poll.
func (r *Repository) TotalForPoll(ctx context.Context, pollID primitive.ObjectID) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{"poll_id": pollID})
}

// GetTimeline returns vote activity bucketed by minute for a poll.
func (r *Repository) GetTimeline(ctx context.Context, pollID primitive.ObjectID) ([]TimelinePoint, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": pollID}}},
		{{Key: "$group", Value: bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%H:%M", "date": "$created_at"}},
			"votes": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type bucketResult struct {
		Timestamp string `bson:"_id"`
		Votes     int64  `bson:"votes"`
	}

	var buckets []bucketResult
	if err := cursor.All(ctx, &buckets); err != nil {
		return nil, err
	}

	timeline := make([]TimelinePoint, 0, len(buckets))
	var cumulative int64
	for _, b := range buckets {
		cumulative += b.Votes
		timeline = append(timeline, TimelinePoint{
			Timestamp:  b.Timestamp,
			Votes:      b.Votes,
			Cumulative: cumulative,
		})
	}

	return timeline, nil
}
