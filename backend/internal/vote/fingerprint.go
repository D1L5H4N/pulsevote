// Package vote — fingerprint.go
//
// Voter fingerprinting is extracted into its own file to make the logic
// easy to find, review, and replace independently of the vote service.
package vote

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"strings"
)

// BuildFingerprint generates a SHA-256 hash that identifies an anonymous voter.
//
// Input: the voter's IP address and User-Agent header.
// Output: a 64-character hex string stored in MongoDB.
//
// Why SHA-256 instead of raw values?
//   - Avoids storing personally-identifiable IP addresses in the database.
//   - Still enables exact duplicate detection per poll.
//
// Limitations (documented in README):
//   - Shared NAT / corporate proxies: multiple real users share one IP.
//   - VPN rotation or User-Agent spoofing can bypass this check.
//   - This is intentionally a lightweight heuristic, not enterprise identity verification.
//
// The MongoDB unique index on (poll_id, voter_fingerprint) provides a hard
// database-level constraint that prevents duplicates even under race conditions.
func BuildFingerprint(ip, userAgent string) string {
	// Normalise to lower-case to prevent trivial bypasses like "Mozilla/5.0" vs "mozilla/5.0"
	raw := fmt.Sprintf("%s|%s", strings.TrimSpace(ip), strings.ToLower(strings.TrimSpace(userAgent)))
	hash := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// ExtractClientIP determines the real client IP from a request.
// In production (behind Render's proxy), the original IP is in X-Forwarded-For.
// In local development, it falls back to the direct connection address.
func ExtractClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// X-Forwarded-For can be a comma-separated list; the first entry is the client
		parts := strings.SplitN(forwarded, ",", 2)
		return strings.TrimSpace(parts[0])
	}
	// Strip port from RemoteAddr (format: "IP:port")
	addr := r.RemoteAddr
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}
