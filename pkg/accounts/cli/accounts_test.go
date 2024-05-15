package cli

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUsernamePasswordSanitation(t *testing.T) {
	t.Parallel()
	t.Run("Username", func(t *testing.T) {
		t.Parallel()
		testCases := []struct {
			username string
			allowed  bool
		}{
			{"alice", true},
			{"bob!!", false},
			{"f", false},
			{"hello@@", false},
			{"bruce_wayne11", true},
		}
		for _, tc := range testCases {
			result := validateUsername(tc.username)
			assert.Equal(t, tc.allowed, result)
		}
	})
	t.Run("Password", func(t *testing.T) {
		t.Parallel()
		testCases := []struct {
			password string
			allowed  bool
		}{
			{"pass", false},
			{"password with spaces", false},
			{"verysecurepassword!", true},
		}
		for _, tc := range testCases {
			result := validatePassword(tc.password)
			assert.Equal(t, tc.allowed, result)
		}
	})
}
