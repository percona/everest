package session

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestExtractUsername(t *testing.T) {
	type tcase struct {
		name          string
		token         *jwt.Token
		error         error
		username      string
		isBuiltInUser bool
	}
	tcases := []tcase{
		{
			name:          "oidc user",
			token:         jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "some_user@email.com", "iss": "external_issuer"}),
			error:         nil,
			username:      "some_user@email.com",
			isBuiltInUser: false,
		},
		{
			name:          "built-in user",
			token:         jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "admin:login", "iss": "everest"}),
			error:         nil,
			username:      "admin",
			isBuiltInUser: true,
		},
		{
			name:          "no sub in token",
			token:         jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{}),
			error:         errExtractSub,
			username:      "",
			isBuiltInUser: false,
		},
		{
			name:          "no iss in token",
			token:         jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "smth"}),
			error:         errExtractIss,
			username:      "",
			isBuiltInUser: false,
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			username, isBuiltInUser, err := extractUsername(tc.token)
			assert.Equal(t, username, tc.username)
			assert.Equal(t, isBuiltInUser, tc.isBuiltInUser)
			assert.Equal(t, tc.error, err)
		})
	}
}
