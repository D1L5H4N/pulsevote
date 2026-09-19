// Package redis wraps the go-redis client for use across the application.
// It provides a single connected client instance and helper functions
// for the Pub/Sub and counter patterns used in real-time vote broadcasting.
package redis

import (
	"context"
	"fmt"
	"log"

	goredis "github.com/redis/go-redis/v9"
)

// Connect establishes a Redis connection from a connection URL.
// Supports the rediss:// scheme required by Upstash (TLS).
// The URL is parsed by go-redis, which handles TLS configuration automatically.
func Connect(redisURL, _ string) (*goredis.Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	client := goredis.NewClient(opts)

	// Verify the connection with a PING command
	ctx := context.Background()
	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, fmt.Errorf("Redis ping failed: %w", err)
	}

	log.Println("[redis] Connected successfully")
	return client, nil
}

// CounterKey returns the namespaced Redis key for a poll option vote counter.
// Example: pulsevote:poll:abc123:option:0
//
// Namespacing with "pulsevote:" prevents key collisions if the same Redis
// instance is shared with other applications.
func CounterKey(pollID string, optionIndex int) string {
	return fmt.Sprintf("pulsevote:poll:%s:option:%d", pollID, optionIndex)
}

// ChannelName returns the Redis Pub/Sub channel name for a given poll.
// Example: pulsevote:poll:abc123
func ChannelName(pollID string) string {
	return fmt.Sprintf("pulsevote:poll:%s", pollID)
}

// PresenceKey returns the namespaced Redis key for tracking connected viewers.
// Example: pulsevote:poll:abc123:viewers
func PresenceKey(pollID string) string {
	return fmt.Sprintf("pulsevote:poll:%s:viewers", pollID)
}
