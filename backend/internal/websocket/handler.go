package websocket

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/pulsevote/backend/internal/auth"
)

// upgrader configures the WebSocket upgrade parameters.
// CheckOrigin is permissive here; origin validation is handled by the CORS
// middleware on the HTTP layer and at the infrastructure level (Render/Vercel).
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, restrict to your Vercel frontend domain.
		// For development, allow all origins.
		return true
	},
}

// Handler upgrades HTTP connections to WebSocket for a specific poll room.
type Handler struct {
	hub *Hub
}

// NewHandler creates a WebSocket Handler with the given Hub.
func NewHandler(hub *Hub) *Handler {
	return &Handler{hub: hub}
}

// ServeWS handles GET /ws/polls/:id
//
// This endpoint upgrades the HTTP connection to a WebSocket and registers
// the client with the hub. From this point on:
//   - The writePump goroutine forwards Redis Pub/Sub messages to the client
//   - The readPump goroutine handles pongs and detects disconnects
//
// No authentication is required - anyone with the poll link can watch results.
func (h *Handler) ServeWS(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "poll ID is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// Upgrade failure is typically a client-side issue (non-WS request)
		return
	}

	client := &Client{
		conn:   conn,
		send:   make(chan []byte, 256), // buffered to absorb burst traffic
		pollID: pollID,
		hub:    h.hub,
	}

	h.hub.Register(client)

	// Start the write and read pumps in separate goroutines.
	// The goroutines manage their own cleanup via deferred hub.Unregister.
	go client.writePump()
	go client.readPump()
}

// ServeDashboardWS handles GET /ws/dashboard for authenticated real-time dashboard events.
func (h *Handler) ServeDashboardWS(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := c.Query("token")
		if tokenStr == "" {
			tokenStr = c.GetHeader("Authorization")
			if strings.HasPrefix(tokenStr, "Bearer ") {
				tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
			}
		}

		var userID string
		if authService != nil && tokenStr != "" {
			claims, err := authService.ValidateToken(tokenStr)
			if err == nil {
				userID = claims.UserID
			}
		}

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		roomID := "dashboard:" + userID
		client := &Client{
			conn:   conn,
			send:   make(chan []byte, 256),
			pollID: roomID,
			hub:    h.hub,
		}

		h.hub.Register(client)

		go client.writePump()
		go client.readPump()
	}
}
