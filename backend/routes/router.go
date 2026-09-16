// Package routes wires together all handlers, middleware, and the Gin engine.
// Centralising route registration here makes it easy to audit all API endpoints.
package routes

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/pulsevote/backend/configs"
	"github.com/pulsevote/backend/internal/auth"
	"github.com/pulsevote/backend/internal/middleware"
	"github.com/pulsevote/backend/internal/poll"
	"github.com/pulsevote/backend/internal/vote"
	appwebsocket "github.com/pulsevote/backend/internal/websocket"
)

// SetupRouter builds the Gin engine with all dependencies injected.
// Each layer (repository → service → handler) is constructed here so that
// the dependency graph is explicit and visible in one place.
func SetupRouter(cfg *configs.Config, mongoClient *mongo.Client, redisClient *goredis.Client) *gin.Engine {
	db := mongoClient.Database(cfg.DBName)

	// --- Repositories (data access layer) ---
	authRepo := auth.NewRepository(db)
	pollRepo := poll.NewRepository(db)
	voteRepo := vote.NewRepository(db)

	// --- Services (business logic layer) ---
	authService := auth.NewService(authRepo, cfg.JWTSecret)
	pollService := poll.NewService(pollRepo)
	voteService := vote.NewService(voteRepo, pollRepo, redisClient)

	// --- Handlers (HTTP layer) ---
	authHandler := auth.NewHandler(authService)
	pollHandler := poll.NewHandler(pollService)
	voteHandler := vote.NewHandler(voteService)

	// --- WebSocket Hub ---
	hub := appwebsocket.NewHub(redisClient)
	wsHandler := appwebsocket.NewHandler(hub)

	// --- Gin Engine ---
	r := gin.Default()

	// CORS: allow localhost, any .vercel.app origin, and configured FRONTEND_URL
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return true
			}
			if origin == cfg.FrontendURL || origin == "http://localhost:5173" || origin == "http://localhost:3000" {
				return true
			}
			if strings.HasSuffix(origin, ".vercel.app") {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check — used by Render for deployment health validation
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "pulsevote-backend"})
	})

	// --- Public API routes ---
	api := r.Group("/api")
	{
		// Auth (no JWT required)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
		}

		// Poll read & vote (public — shared poll links work without login)
		api.GET("/polls/:id", pollHandler.GetByID)
		api.POST("/polls/:id/vote", voteHandler.Vote)
		api.GET("/polls/:id/results", voteHandler.GetResults)
	}

	// --- Authenticated API routes ---
	authMiddleware := middleware.RequireAuth(authService)
	protected := r.Group("/api", authMiddleware)
	{
		protected.GET("/polls", pollHandler.ListByCreator)
		protected.POST("/polls", pollHandler.Create)
		protected.PATCH("/polls/:id/close", pollHandler.Close)
		protected.DELETE("/polls/:id", pollHandler.Delete)
		protected.GET("/dashboard", pollHandler.GetDashboardStats)
	}

	// --- WebSocket endpoint (public — viewers don't need an account) ---
	r.GET("/ws/polls/:id", wsHandler.ServeWS)

	return r
}
