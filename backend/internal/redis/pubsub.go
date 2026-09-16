package redis

import (
	"context"
	"encoding/json"
	"fmt"

	goredis "github.com/redis/go-redis/v9"
)

// Publish serializes payload as JSON and publishes it to the poll's Redis channel.
// This is called by the vote service immediately after a vote is recorded,
// triggering the real-time broadcast to all connected WebSocket clients.
func Publish(ctx context.Context, client *goredis.Client, pollID string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal pubsub payload: %w", err)
	}
	return client.Publish(ctx, ChannelName(pollID), string(data)).Err()
}

// Subscribe creates a Redis Pub/Sub subscription for a poll's update channel.
// The caller is responsible for calling pubsub.Close() when the subscription
// is no longer needed (i.e., when the last WebSocket client leaves the room).
func Subscribe(ctx context.Context, client *goredis.Client, pollID string) *goredis.PubSub {
	return client.Subscribe(ctx, ChannelName(pollID))
}
