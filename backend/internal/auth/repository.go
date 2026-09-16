package auth

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Repository handles all MongoDB operations in the auth domain.
// It does not contain business logic — that lives in the Service.
type Repository struct {
	collection *mongo.Collection
}

// NewRepository creates a Repository and ensures necessary indexes exist.
// The unique email index prevents duplicate accounts at the database level,
// providing a second line of defense after the application-level uniqueness check.
func NewRepository(db *mongo.Database) *Repository {
	coll := db.Collection("users")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Unique index on email for O(1) lookups and duplicate prevention
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	// CreateOne is idempotent — safe to call on every restart
	if _, err := coll.Indexes().CreateOne(ctx, indexModel); err != nil {
		// Non-fatal: index may already exist
		_ = err
	}

	return &Repository{collection: coll}
}

// FindByEmail retrieves a user by email address.
// Returns mongo.ErrNoDocuments if no matching user exists.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create inserts a new User document.
// The ID and CreatedAt are set here to keep that responsibility in the data layer.
func (r *Repository) Create(ctx context.Context, user *User) error {
	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now().UTC()
	_, err := r.collection.InsertOne(ctx, user)
	return err
}

// FindByID retrieves a user by their ObjectID.
func (r *Repository) FindByID(ctx context.Context, id primitive.ObjectID) (*User, error) {
	var user User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
