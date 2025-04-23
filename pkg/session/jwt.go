// everest
// Copyright (C) 2025 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package session

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/golang-jwt/jwt/v5"
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

func shortenToken(token *jwt.Token) (string, error) {
	content, err := extractContent(token)
	if err != nil {
		return "", err
	}
	jti, ok := content.Payload["jti"].(string)
	if !ok {
		return "", errExtractJti
	}
	exp, ok := content.Payload["exp"].(float64)
	if !ok {
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
