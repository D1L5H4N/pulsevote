package poll

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Repository handles MongoDB operations for the poll domain.
type Repository struct {
	collection *mongo.Collection
}

// NewRepository creates a Repository and ensures compound indexes exist.
func NewRepository(db *mongo.Database) *Repository {
	coll := db.Collection("polls")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Compound indexes support the most common query patterns:
	//   - Find polls by creator, sorted by creation date (dashboard)
	//   - Filter by status (active/closed/expired counts)
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "creator_id", Value: 1}, {Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	}
	if _, err := coll.Indexes().CreateMany(ctx, indexes); err != nil {
		_ = err // non-fatal on restart (indexes may already exist)
	}

	return &Repository{collection: coll}
}

// Create inserts a new poll and populates its ID and timestamps.
func (r *Repository) Create(ctx context.Context, p *Poll) error {
	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now().UTC()
	p.UpdatedAt = time.Now().UTC()
	_, err := r.collection.InsertOne(ctx, p)
	return err
}

// FindByID retrieves a poll by its ObjectID.
// Returns mongo.ErrNoDocuments if not found.
func (r *Repository) FindByID(ctx context.Context, id primitive.ObjectID) (*Poll, error) {
	var p Poll
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// FindByCreator returns all polls owned by a user, newest first.
func (r *Repository) FindByCreator(ctx context.Context, creatorID primitive.ObjectID) ([]*Poll, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"creator_id": creatorID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []*Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

// UpdateStatus atomically updates the poll status and updated_at timestamp.
func (r *Repository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status PollStatus) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"status": status, "updated_at": time.Now().UTC()}},
	)
	return err
}

// UpdateStatusAndExpiry atomically updates the poll status, optional expires_at, and updated_at.
func (r *Repository) UpdateStatusAndExpiry(ctx context.Context, id primitive.ObjectID, status PollStatus, expiresAt *time.Time) error {
	update := bson.M{
		"status":     status,
		"updated_at": time.Now().UTC(),
		"expires_at": expiresAt,
	}
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	return err
}

// Delete removes a poll document.
// Ownership validation must be performed before calling this method.
func (r *Repository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// CountByCreator counts polls for a creator, optionally filtered by status.
// Pass an empty string for status to count all polls.
func (r *Repository) CountByCreator(ctx context.Context, creatorID primitive.ObjectID, status PollStatus) (int64, error) {
	filter := bson.M{"creator_id": creatorID}
	if status != "" {
		filter["status"] = status
	}
	return r.collection.CountDocuments(ctx, filter)
}
