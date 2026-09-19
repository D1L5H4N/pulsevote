package poll

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes HTTP endpoints for poll management.
type Handler struct {
	service *Service
}

// NewHandler creates a poll Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create handles POST /api/polls  (authenticated)
func (h *Handler) Create(c *gin.Context) {
	var req CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// CreatorID comes from the JWT middleware - never from the request body
	creatorID := c.GetString("userID")
	p, err := h.service.Create(c.Request.Context(), creatorID, &req)
	if err != nil {
		switch {
		case errors.Is(err, ErrDuplicateOption), errors.Is(err, ErrExpiredTime):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create poll"})
		}
		return
	}

	c.JSON(http.StatusCreated, ToPollResponse(p))
}

// GetByID handles GET /api/polls/:id  (public)
func (h *Handler) GetByID(c *gin.Context) {
	pollID := c.Param("id")
	p, err := h.service.GetByID(c.Request.Context(), pollID)
	if err != nil {
		if errors.Is(err, ErrPollNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch poll"})
		return
	}
	// Record view asynchronously
	h.service.IncrementViews(c.Request.Context(), pollID)

	c.JSON(http.StatusOK, ToPollResponse(p))
}

// ListByCreator handles GET /api/polls  (authenticated)
func (h *Handler) ListByCreator(c *gin.Context) {
	creatorID := c.GetString("userID")
	polls, err := h.service.ListByCreator(c.Request.Context(), creatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list polls"})
		return
	}

	resp := make([]PollResponse, len(polls))
	for i, p := range polls {
		resp[i] = ToPollResponse(p)
	}
	c.JSON(http.StatusOK, resp)
}

// Close handles PATCH /api/polls/:id/close  (authenticated, owner only)
func (h *Handler) Close(c *gin.Context) {
	userID := c.GetString("userID")
	if err := h.service.Close(c.Request.Context(), c.Param("id"), userID); err != nil {
		switch {
		case errors.Is(err, ErrPollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, ErrNotOwner):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close poll"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "poll closed successfully"})
}

// Open handles PATCH /api/polls/:id/open  (authenticated, owner only)
func (h *Handler) Open(c *gin.Context) {
	userID := c.GetString("userID")
	var req ReopenPollRequest
	_ = c.ShouldBindJSON(&req)

	if err := h.service.Open(c.Request.Context(), c.Param("id"), userID, req.ExpiresAt); err != nil {
		switch {
		case errors.Is(err, ErrPollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, ErrNotOwner):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, ErrExpiredTime):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open poll"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "poll opened successfully"})
}

// Delete handles DELETE /api/polls/:id  (authenticated, owner only)
func (h *Handler) Delete(c *gin.Context) {
	userID := c.GetString("userID")
	if err := h.service.Delete(c.Request.Context(), c.Param("id"), userID); err != nil {
		switch {
		case errors.Is(err, ErrPollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, ErrNotOwner):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete poll"})
		}
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// GetDashboardStats handles GET /api/dashboard  (authenticated)
func (h *Handler) GetDashboardStats(c *gin.Context) {
	userID := c.GetString("userID")
	stats, err := h.service.GetDashboardStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// Duplicate handles POST /api/polls/:id/duplicate (authenticated, owner only)
func (h *Handler) Duplicate(c *gin.Context) {
	userID := c.GetString("userID")
	p, err := h.service.Duplicate(c.Request.Context(), c.Param("id"), userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrPollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, ErrNotOwner):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to duplicate poll"})
		}
		return
	}
	c.JSON(http.StatusCreated, ToPollResponse(p))
}

// Export handles GET /api/polls/:id/export (authenticated, owner only)
func (h *Handler) Export(c *gin.Context) {
	userID := c.GetString("userID")
	pollID := c.Param("id")
	format := c.DefaultQuery("format", "csv")

	if format == "csv" || format == "excel" {
		csvContent, err := h.service.ExportCSV(c.Request.Context(), pollID, userID)
		if err != nil {
			switch {
			case errors.Is(err, ErrPollNotFound):
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			case errors.Is(err, ErrNotOwner):
				c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export poll data"})
			}
			return
		}
		filename := fmt.Sprintf("poll_%s_export.csv", pollID)
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", []byte(csvContent))
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported format, use csv or excel"})
}
