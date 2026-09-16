// Package main is the entry point for the PulseVote backend server.
// It initialises all external connections, builds the Gin router, and
// manages graceful shutdown to avoid dropping in-flight requests.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pulsevote/backend/configs"
	mongoconn "github.com/pulsevote/backend/internal/mongodb"
	redisconn "github.com/pulsevote/backend/internal/redis"
	"github.com/pulsevote/backend/routes"
)

func main() {
	// Load and validate configuration from environment variables
	cfg := configs.Load()

	// Initialise MongoDB — fail fast if unavailable at startup
	mongoClient, err := mongoconn.Connect(cfg.MongoURI)
	if err != nil {
		log.Fatalf("[main] MongoDB connection failed: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mongoClient.Disconnect(ctx); err != nil {
			log.Printf("[main] MongoDB disconnect error: %v", err)
		}
		log.Println("[main] MongoDB disconnected cleanly")
	}()

	// Initialise Redis — fail fast if unavailable at startup
	redisClient, err := redisconn.Connect(cfg.RedisURL, cfg.RedisPassword)
	if err != nil {
		log.Fatalf("[main] Redis connection failed: %v", err)
	}
	defer func() {
		if err := redisClient.Close(); err != nil {
			log.Printf("[main] Redis close error: %v", err)
		}
		log.Println("[main] Redis disconnected cleanly")
	}()

	// Build the Gin router with all dependencies injected
	router := routes.SetupRouter(cfg, mongoClient, redisClient)

	// Configure the HTTP server with production-appropriate timeouts.
	// Without these, slow clients can hold connections open indefinitely.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // longer for WebSocket upgrade
		IdleTimeout:  120 * time.Second,
	}

	// Start listening in a goroutine so the main goroutine can wait for signals
	go func() {
		log.Printf("[main] Quorum server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[main] Server error: %v", err)
		}
	}()

	// Block until we receive SIGINT or SIGTERM (e.g., Render sends SIGTERM on deploy)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[main] Shutdown signal received — draining connections...")

	// Give in-flight requests up to 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[main] Forced shutdown: %v", err)
	}

	log.Println("[main] Server shut down cleanly")
}
