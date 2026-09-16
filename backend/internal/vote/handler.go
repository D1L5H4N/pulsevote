package vote

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pulsevote/backend/internal/poll"
)

// Handler exposes HTTP endpoints for vote submission and result retrieval.
type Handler struct {
	service *Service
}

// NewHandler creates a vote Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Vote handles POST /api/polls/:id/vote
//
// This endpoint is intentionally public (no auth required) so that anyone
// with a shared poll link can vote without creating an account.
//
// The client IP is extracted from X-Forwarded-For (set by Render/proxies)
// and falls back to RemoteAddr for local development.
func (h *Handler) Vote(c *gin.Context) {
	pollID := c.Param("id")

	var req VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "option_index is required and must be a non-negative integer"})
		return
	}

	// Determine real client IP (Render sits behind a proxy)
	clientIP := c.GetHeader("X-Forwarded-For")
	if clientIP == "" {
		clientIP = c.ClientIP()
	}
	userAgent := c.GetHeader("User-Agent")

	results, err := h.service.Vote(c.Request.Context(), pollID, req.OptionIndex, clientIP, userAgent)
	if err != nil {
		switch {
		case errors.Is(err, poll.ErrPollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, ErrPollNotVotable):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, ErrAlreadyVoted):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, ErrInvalidOption):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "vote failed, please try again"})
		}
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetResults handles GET /api/polls/:id/results
//
// Returns the current vote tallies. The WebSocket connection provides
// live updates; this endpoint is used for the initial page load.
func (h *Handler) GetResults(c *gin.Context) {
	pollID := c.Param("id")

	results, err := h.service.GetResults(c.Request.Context(), pollID)
	if err != nil {
		if errors.Is(err, poll.ErrPollNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch results"})
		return
	}

	c.JSON(http.StatusOK, results)
}
