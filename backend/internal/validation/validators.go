// Package validation provides reusable input validation helpers used across
// the application's service and handler layers.
//
// Design rationale: Keeping validation utilities in a dedicated package prevents
// duplication across the auth, poll, and vote domains and makes validation
// logic easy to locate and unit-test independently.
package validation

import (
	"errors"
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrEmptyField      = errors.New("field cannot be empty")
	ErrInvalidObjectID = errors.New("invalid ID format")
	ErrInvalidEmail    = errors.New("invalid email address")
	ErrPasswordTooShort = errors.New("password must be at least 8 characters")
)

// emailRegex is a practical email validation pattern.
// It is intentionally not RFC-5321-complete; we favour readability
// and reject obvious garbage over handling every edge case.
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// ObjectID validates and parses a hex string into a MongoDB ObjectID.
// Centralising this avoids repeated ObjectIDFromHex + error check patterns.
func ObjectID(id string) (primitive.ObjectID, error) {
	if id == "" {
		return primitive.NilObjectID, ErrEmptyField
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return primitive.NilObjectID, ErrInvalidObjectID
	}
	return oid, nil
}

// Email returns nil if the email is a well-formed address.
func Email(email string) error {
	if !emailRegex.MatchString(strings.TrimSpace(email)) {
		return ErrInvalidEmail
	}
	return nil
}

// Password returns nil if the password meets the minimum length requirement.
func Password(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}
	return nil
}

// PollOptions validates a slice of poll option strings.
// Rules (mirror what the database and Gin binding tags enforce):
//   - At least 2 options
//   - At most 6 options
//   - No empty options
//   - No duplicate options (case-insensitive, trimmed)
//   - Each option ≤ 200 characters
func PollOptions(options []string) error {
	if len(options) < 2 {
		return errors.New("poll must have at least 2 options")
	}
	if len(options) > 6 {
		return errors.New("poll cannot have more than 6 options")
	}

	seen := make(map[string]bool, len(options))
	for i, opt := range options {
		trimmed := strings.TrimSpace(opt)
		if trimmed == "" {
			return errors.New("option cannot be empty")
		}
		if len(trimmed) > 200 {
			return errors.New("each option must be 200 characters or fewer")
		}
		key := strings.ToLower(trimmed)
		if seen[key] {
			return errors.New("poll options must be unique (case-insensitive)")
		}
		seen[key] = true
		options[i] = trimmed // normalise in-place
	}
	return nil
}

// NonEmpty returns an error if the trimmed string is blank.
func NonEmpty(value, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return errors.New(fieldName + " cannot be empty")
	}
	return nil
}
