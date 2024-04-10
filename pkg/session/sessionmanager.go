// everest
// Copyright (C) 2023 Percona LLC
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

// Package session ...
package session

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"golang.org/x/crypto/pbkdf2"

	"github.com/golang-jwt/jwt/v4"

	"github.com/percona/everest/pkg/kubernetes"
)

const (
	// SessionManagerClaimsIssuer fills the "iss" field of the token.
	SessionManagerClaimsIssuer = "everest"
)

type SessionManager struct {
	kubeClient *kubernetes.Kubernetes
	salt       []byte
	signKey    []byte
}

func NewSessionManager(kubeClient *kubernetes.Kubernetes, salt []byte, signKey []byte) *SessionManager {
	return &SessionManager{
		kubeClient: kubeClient,
		salt: salt,
		signKey: signKey,
	}
}

// Create creates a new token for a given subject (user) and returns it as a string.
// Passing a value of `0` for secondsBeforeExpiry creates a token that never expires.
// The id parameter holds an optional unique JWT token identifier and stored as a standard claim "jti" in the JWT token.
func (mgr *SessionManager) Create(subject string, secondsBeforeExpiry int64, id string) (string, error) {
	// Create a new token object, specifying signing method and the claims
	// you would like it to contain.
	now := time.Now().UTC()
	claims := jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(now),
		Issuer:    SessionManagerClaimsIssuer,
		NotBefore: jwt.NewNumericDate(now),
		Subject:   subject,
		ID:        id,
	}
	if secondsBeforeExpiry > 0 {
		expires := now.Add(time.Duration(secondsBeforeExpiry) * time.Second)
		claims.ExpiresAt = jwt.NewNumericDate(expires)
	}

	return mgr.signClaims(claims)
}

func (mgr *SessionManager) signClaims(claims jwt.Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(mgr.signKey)
}

// VerifyUsernamePassword verifies if a username/password combo is correct
func (mgr *SessionManager) VerifyUsernamePassword(ctx context.Context, username string, password string) error {
	if password == "" {
		return fmt.Errorf("blank passwords are not allowed")
	}

	account, err := mgr.kubeClient.GetAccount(ctx, username)
	if err != nil {
		return err
	}

	hash := pbkdf2.Key([]byte(password), mgr.salt, 4096, 32, sha256.New)
	if string(hash) != account.PasswordHash {
		return fmt.Errorf("invalid login")
	}

	if !account.Enabled {
		return fmt.Errorf("account disabled")
	}

	if !account.HasCapability(kubernetes.AccountCapabilityLogin) {
		return fmt.Errorf("user does not have capability")
	}
	return nil
}
