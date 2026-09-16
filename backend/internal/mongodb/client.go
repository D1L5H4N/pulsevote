// Package mongodb provides a thin wrapper around the official MongoDB Go driver
// for establishing and verifying database connections.
package mongodb

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect establishes a connection to MongoDB using the provided URI.
// It verifies the connection with a Ping before returning, so callers
// can be certain the database is reachable at startup.
func Connect(uri string) (*mongo.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(uri).
		SetServerSelectionTimeout(10 * time.Second).
		SetConnectTimeout(10 * time.Second)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}

	// Ping validates that the connection is truly established.
	// Without this, mongo.Connect can succeed even when the server is unreachable.
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Println("[mongodb] Connected successfully")
	return client, nil
}
