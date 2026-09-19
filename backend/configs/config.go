// Package configs handles loading and validating all application configuration
// from environment variables. This centralizes config management so that other
// packages can receive a *Config via dependency injection rather than calling
// os.Getenv directly, making the codebase more testable.
package configs

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
// Each field maps directly to an environment variable.
type Config struct {
	Port          string
	MongoURI      string
	DBName        string
	JWTSecret     string
	RedisURL      string
	RedisPassword string
	FrontendURL   string
}

// Load reads configuration from environment variables.
// In local development it also loads from a .env file if present.
// In production (Render), environment variables are injected by the platform
// so the .env file is not required and its absence is not an error.
func Load() *Config {
	// Attempt .env load - silently ignored in production environments
	if err := godotenv.Load(); err != nil {
		log.Println("[config] No .env file found - reading from system environment")
	}

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		MongoURI:      getEnv("MONGODB_URI", ""),
		DBName:        getEnv("DB_NAME", "pulsevote"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		RedisURL:      getEnv("REDIS_URL", ""),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		FrontendURL:   getEnv("FRONTEND_URL", "http://localhost:5173"),
	}

	// Fail fast: if critical config is missing, the application cannot start safely.
	// This surfaces misconfiguration early rather than producing cryptic runtime errors.
	if cfg.MongoURI == "" {
		log.Fatal("[config] MONGODB_URI is required but not set")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("[config] JWT_SECRET is required but not set")
	}
	if cfg.RedisURL == "" {
		log.Fatal("[config] REDIS_URL is required but not set")
	}

	return cfg
}

// getEnv returns the value of the environment variable named by key,
// or defaultValue if the variable is not set or is empty.
func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
