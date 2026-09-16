// Package auth handles user registration, login, and JWT management.
package auth

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User is the MongoDB document model for a registered user.
// The PasswordHash field is never serialized to JSON (json:"-") to ensure
// it is never accidentally exposed in API responses.
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name"          json:"name"`
	Email        string             `bson:"email"         json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	CreatedAt    time.Time          `bson:"created_at"    json:"created_at"`
}

// RegisterRequest is the expected JSON body for POST /api/auth/register.
// Gin binding tags handle required field and format validation.
type RegisterRequest struct {
	Name     string `json:"name"     binding:"required,min=2,max=100"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=100"`
}

// LoginRequest is the expected JSON body for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse is returned on successful register or login.
// It contains the JWT and safe user information.
type AuthResponse struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

// UserDTO is the public-safe representation of a user.
// It deliberately excludes the password hash.
type UserDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
