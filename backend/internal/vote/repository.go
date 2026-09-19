package vote

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/pulsevote/backend/internal/poll"
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

// TotalForPolls returns the total number of votes cast across multiple polls.
func (r *Repository) TotalForPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error) {
	if len(pollIDs) == 0 {
		return 0, nil
	}
	return r.collection.CountDocuments(ctx, bson.M{"poll_id": bson.M{"$in": pollIDs}})
}

// TotalParticipantsForPolls counts unique voters across multiple polls.
func (r *Repository) TotalParticipantsForPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error) {
	if len(pollIDs) == 0 {
		return 0, nil
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": bson.M{"$in": pollIDs}}}},
		{{Key: "$group", Value: bson.M{"_id": "$voter_fingerprint"}}},
		{{Key: "$count", Value: "total"}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var res []bson.M
	if err := cursor.All(ctx, &res); err != nil {
		return 0, err
	}
	if len(res) == 0 {
		return 0, nil
	}
	if val, ok := res[0]["total"].(int32); ok {
		return int64(val), nil
	}
	if val, ok := res[0]["total"].(int64); ok {
		return val, nil
	}
	return 0, nil
}

// GetDeviceAnalytics aggregates device breakdown across multiple polls.
func (r *Repository) GetDeviceAnalytics(ctx context.Context, pollIDs []primitive.ObjectID) (int64, int64, int64, error) {
	if len(pollIDs) == 0 {
		return 0, 0, 0, nil
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": bson.M{"$in": pollIDs}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$device",
			"count": bson.M{"$sum": 1},
		}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Device string `bson:"_id"`
		Count  int64  `bson:"count"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return 0, 0, 0, err
	}

	var mobile, desktop, tablet int64
	for _, res := range results {
		switch res.Device {
		case "mobile":
			mobile += res.Count
		case "tablet":
			tablet += res.Count
		default:
			desktop += res.Count
		}
	}
	return mobile, desktop, tablet, nil
}

// GetGeoAnalytics aggregates country-level vote totals across multiple polls.
func (r *Repository) GetGeoAnalytics(ctx context.Context, pollIDs []primitive.ObjectID) ([]poll.GeoItem, error) {
	if len(pollIDs) == 0 {
		return []poll.GeoItem{}, nil
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": bson.M{"$in": pollIDs}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$country",
			"votes": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"votes": -1}}},
		{{Key: "$limit", Value: 6}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Country string `bson:"_id"`
		Votes   int64  `bson:"votes"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	var totalVotes int64
	for _, r := range results {
		totalVotes += r.Votes
	}

	geoItems := make([]poll.GeoItem, 0, len(results))
	for _, r := range results {
		country := r.Country
		if country == "" {
			country = "Global"
		}
		pct := 0.0
		if totalVotes > 0 {
			pct = float64(r.Votes) / float64(totalVotes) * 100.0
		}
		geoItems = append(geoItems, poll.GeoItem{
			Country:    country,
			Votes:      r.Votes,
			Percentage: pct,
		})
	}
	return geoItems, nil
}

// GetTimelineForPolls aggregates vote velocity chronologically across multiple polls.
func (r *Repository) GetTimelineForPolls(ctx context.Context, pollIDs []primitive.ObjectID) ([]poll.DashboardTimelinePoint, error) {
	if len(pollIDs) == 0 {
		return []poll.DashboardTimelinePoint{}, nil
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": bson.M{"$in": pollIDs}}}},
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

	timeline := make([]poll.DashboardTimelinePoint, 0, len(buckets))
	var cumulative int64
	for _, b := range buckets {
		cumulative += b.Votes
		timeline = append(timeline, poll.DashboardTimelinePoint{
			Timestamp:  b.Timestamp,
			Votes:      b.Votes,
			Cumulative: cumulative,
		})
	}

	return timeline, nil
}

// GetVotesForExport retrieves all vote records for a poll.
func (r *Repository) GetVotesForExport(ctx context.Context, pollID primitive.ObjectID) ([]Vote, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := r.collection.Find(ctx, bson.M{"poll_id": pollID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var votes []Vote
	if err := cursor.All(ctx, &votes); err != nil {
		return nil, err
	}
	return votes, nil
}

// GetExportRows returns lightweight export rows for a poll.
func (r *Repository) GetExportRows(ctx context.Context, pollID primitive.ObjectID) ([]poll.ExportVoteRow, error) {
	votes, err := r.GetVotesForExport(ctx, pollID)
	if err != nil {
		return nil, err
	}
	rows := make([]poll.ExportVoteRow, 0, len(votes))
	for _, v := range votes {
		dev := v.Device
		if dev == "" {
			dev = "desktop"
		}
		ctry := v.Country
		if ctry == "" {
			ctry = "Global"
		}
		rows = append(rows, poll.ExportVoteRow{
			CreatedAt:   v.CreatedAt,
			OptionIndex: v.OptionIndex,
			Device:      dev,
			Country:     ctry,
		})
	}
	return rows, nil
}
