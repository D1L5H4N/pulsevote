package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Sentinel errors allow callers to use errors.Is() for type-safe error handling
// without depending on string comparison.
var (
	ErrUserExists         = errors.New("a user with this email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// Claims defines the custom JWT payload.
// Embedding jwt.RegisteredClaims gives us standard fields (exp, iat, sub) for free.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

// Service handles authentication business logic.
// It depends on Repository for data access and holds the JWT secret.
type Service struct {
	repo      *Repository
	jwtSecret []byte
}

// NewService constructs an auth Service.
func NewService(repo *Repository, jwtSecret string) *Service {
	return &Service{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

// Register creates a new user account.
//
// Design decisions:
//   - bcrypt cost 12: balances security with performance (~250ms on modern hardware).
//     Too low (< 10) is weak; too high (> 14) blocks request goroutines.
//   - Uniqueness checked at application level first for a clear error message,
//     with the database unique index as a final safety net.
func (s *Service) Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
	// Check uniqueness before hashing to avoid unnecessary CPU work
	_, err := s.repo.FindByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrUserExists
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, err // unexpected DB error
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	user := &User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  toDTO(user),
	}, nil
}

// Login authenticates a user and returns a signed JWT.
//
// Security note: We return a generic ErrInvalidCredentials for both "user not found"
// and "wrong password" cases. This prevents user enumeration attacks where an
// attacker could determine whether an email is registered.
func (s *Service) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  toDTO(user),
	}, nil
}

// ValidateToken parses a JWT string and returns the embedded claims.
// Returns ErrInvalidToken for any validation failure.
func (s *Service) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		// Ensure the signing method is HMAC - reject tokens signed with unexpected algorithms.
		// This prevents algorithm confusion attacks.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// generateToken creates a signed JWT for the given user, valid for 24 hours.
func (s *Service) generateToken(user *User) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: user.ID.Hex(),
		Email:  user.Email,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.Hex(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// toDTO converts a User to a public-safe UserDTO.
func toDTO(u *User) UserDTO {
	return UserDTO{
		ID:    u.ID.Hex(),
		Name:  u.Name,
		Email: u.Email,
	}
}
