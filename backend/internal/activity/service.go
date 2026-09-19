package activity

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	goredis "github.com/redis/go-redis/v9"

	redisutil "github.com/pulsevote/backend/internal/redis"
)

// Service provides methods for recording and streaming user activity.
type Service struct {
	repo  *Repository
	redis *goredis.Client
}

// NewService creates a new activity service.
func NewService(repo *Repository, redis *goredis.Client) *Service {
	return &Service{
		repo:  repo,
		redis: redis,
	}
}

// RecordActivity stores an activity in MongoDB and broadcasts it via Redis Pub/Sub.
func (s *Service) RecordActivity(ctx context.Context, userID primitive.ObjectID, pollID primitive.ObjectID, pollTitle string, actType string, message string) {
	act := &Activity{
		UserID:    userID,
		PollID:    pollID,
		PollTitle: pollTitle,
		Type:      actType,
		Message:   message,
		CreatedAt: time.Now().UTC(),
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := s.repo.Create(bgCtx, act); err != nil {
			log.Printf("[activity] failed to save activity: %v", err)
		}

		if s.redis != nil {
			channel := redisutil.DashboardChannelName(userID.Hex())
			payload, err := json.Marshal(act)
			if err == nil {
				_ = s.redis.Publish(bgCtx, channel, string(payload)).Err()
			}
		}
	}()
}

// GetRecentActivities returns recent activities for a given user.
func (s *Service) GetRecentActivities(ctx context.Context, userID primitive.ObjectID, limit int64) ([]Activity, error) {
	return s.repo.GetRecentByUserID(ctx, userID, limit)
}
