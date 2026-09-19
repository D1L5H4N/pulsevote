package activity

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Repository handles database operations for user activity events.
type Repository struct {
	collection *mongo.Collection
}

// NewRepository creates a new activity repository.
func NewRepository(db *mongo.Database) *Repository {
	return &Repository{
		collection: db.Collection("activities"),
	}
}

// EnsureIndexes creates index on user_id and created_at.
func (r *Repository) EnsureIndexes(ctx context.Context) error {
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().SetName("user_id_created_at_idx"),
	}
	_, err := r.collection.Indexes().CreateOne(ctx, indexModel)
	return err
}

// Create inserts a new activity record.
func (r *Repository) Create(ctx context.Context, act *Activity) error {
	act.ID = primitive.NewObjectID()
	if act.CreatedAt.IsZero() {
		act.CreatedAt = time.Now().UTC()
	}
	_, err := r.collection.InsertOne(ctx, act)
	return err
}

// GetRecentByUserID fetches the latest activity records for a user.
func (r *Repository) GetRecentByUserID(ctx context.Context, userID primitive.ObjectID, limit int64) ([]Activity, error) {
	if limit <= 0 {
		limit = 20
	}
	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.collection.Find(ctx, bson.M{"user_id": userID}, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []Activity
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, err
	}
	if activities == nil {
		activities = []Activity{}
	}
	return activities, nil
}
