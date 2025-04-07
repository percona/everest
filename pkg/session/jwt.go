package session

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/golang-jwt/jwt/v5"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

var (
	errEmptyToken       = errors.New("token is empty")
	errExtractJti       = errors.New("could not extract jti")
	errExtractExp       = errors.New("could not extract exp")
	errUnsupportedClaim = func(claims any) error {
		return errors.New(fmt.Sprintf("unsupported claims type: %T", claims))
	}
)

type JWTContent struct {
	Payload map[string]interface{} `json:"payload"`
}

func shrinkToken(token *jwt.Token) (string, error) {
	l := log.FromContext(context.Background())
	content, err := extractContent(token)
	if err != nil {
		l.Error(err, "could not extract content")
		return "", err
	}
	l.Info("payload", "content", content.Payload)
	jti, ok := content.Payload["jti"].(string)
	if !ok {
		l.Error(err, "could not extract jti")
		return "", errExtractJti
	}
	exp, ok := content.Payload["exp"].(float64)
	if !ok {
		l.Error(err, "could not extract exp")
		return "", errExtractExp
	}
	return jti + strconv.FormatFloat(exp, 'f', 0, 64), nil
}

func extractContent(token *jwt.Token) (*JWTContent, error) {
	if token == nil {
		return nil, errEmptyToken
	}
	claimsMap := make(map[string]interface{})

	switch claims := token.Claims.(type) {
	case jwt.MapClaims:
		for key, val := range claims {
			claimsMap[key] = val
		}
	default:
		return nil, errUnsupportedClaim(claims)
	}

	return &JWTContent{
		Payload: claimsMap,
	}, nil
}
