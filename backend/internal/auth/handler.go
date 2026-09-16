package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes HTTP endpoints for the auth domain.
type Handler struct {
	service *Service
}

// NewHandler creates a Handler with the given service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register handles POST /api/auth/register
//
// Request body: { "name": string, "email": string, "password": string }
// Response 201: { "token": string, "user": { "id", "name", "email" } }
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Register(c.Request.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserExists):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed, please try again"})
		}
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// Login handles POST /api/auth/login
//
// Request body: { "email": string, "password": string }
// Response 200: { "token": string, "user": { "id", "name", "email" } }
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			// Use 401 for auth failures — never reveal whether the email exists
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed, please try again"})
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}
