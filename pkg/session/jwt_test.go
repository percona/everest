package session

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestShortenToken(t *testing.T) {
	type tcase struct {
		name           string
		claims         jwt.MapClaims
		shortenedToken string
		error          error
	}
	tcases := []tcase{
		{
			name: "valid",
			claims: jwt.MapClaims{
				"jti": "9d1c1f98-a479-41e3-8939-c7cb3edefa",
				"exp": float64(331743679478),
			},
			shortenedToken: "9d1c1f98-a479-41e3-8939-c7cb3edefa331743679478",
			error:          nil,
		},
		{
			name: "no jti",
			claims: jwt.MapClaims{
				"exp": float64(331743679478),
			},
			shortenedToken: "",
			error:          errExtractJti,
		},
		{
			name: "no exp",
			claims: jwt.MapClaims{
				"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a",
			},
			shortenedToken: "",
			error:          errExtractExp,
		},
	}
	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result, err := shortenToken(jwt.NewWithClaims(jwt.SigningMethodHS256, tc.claims))
			assert.Equal(t, tc.error, err)
			assert.Equal(t, tc.shortenedToken, result)
		})
	}
}

func TestExtractContent(t *testing.T) {
	type tcase struct {
		name   string
		token  *jwt.Token
		error  error
		result *JWTContent
	}
	tokenUnsupportedClaims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{})
	tcases := []tcase{
		{
			name:   "empty token",
			token:  nil,
			result: nil,
			error:  errEmptyToken,
		},
		{
			name:   "unsupported claims",
			token:  tokenUnsupportedClaims,
			result: nil,
			error:  errUnsupportedClaim(tokenUnsupportedClaims.Claims),
		},
		{
			name:  "valid empty payload",
			token: jwt.New(jwt.SigningMethodHS256),
			result: &JWTContent{
				Payload: make(map[string]interface{}),
			},
			error: nil,
		},
		{
			name:  "valid with payload",
			token: jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a", "exp": float64(331743679478)}),
			result: &JWTContent{
				Payload: map[string]interface{}{"exp": float64(331743679478), "jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a"},
			},
			error: nil,
		},
	}
	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result, err := extractContent(tc.token)
			assert.Equal(t, tc.error, err)
			assert.Equal(t, tc.result, result)
		})
	}
}
