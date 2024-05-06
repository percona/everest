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

// Package session provides a session manager for creating and verifying JWT tokens.
package session

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"

	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/client/accounts"
)

const (
	// SessionManagerClaimsIssuer fills the "iss" field of the token.
	SessionManagerClaimsIssuer = "everest"
)

// SessionManager provides functionality for creating and managing JWT tokens.
type SessionManager struct {
	accountManager kubernetes.Accounts
	signingKey     []byte
}

// Option is a function that modifies a SessionManager.
type Option func(*SessionManager)

// New creates a new session manager with the given options.
func New(options ...Option) *SessionManager {
	m := &SessionManager{}
	for _, opt := range options {
		opt(m)
	}
	return m
}

// WithAccountManager sets the account manager to use for verifying user credentials.
func WithAccountManager(am kubernetes.Accounts) Option {
	return func(m *SessionManager) {
		m.accountManager = am
	}
}

// WithSigningKey sets the signing key to use for managing JWT tokens.
func WithSigningKey(key []byte) Option {
	return func(m *SessionManager) {
		m.signingKey = key
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
	return token.SignedString(mgr.signingKey)
}

// Authenticate verifies the given username and password.
func (mgr *SessionManager) Authenticate(ctx context.Context, username string, password string) error {
	if password == "" {
		return fmt.Errorf("blank passwords are not allowed")
	}

	account, err := mgr.accountManager.Get(ctx, username)
	if err != nil {
		return err
	}

	computedHash, err := mgr.accountManager.ComputePasswordHash(ctx, password)
	if err != nil {
		return errors.Join(err, errors.New("failed to compute password hash"))
	}

	if computedHash != account.PasswordHash {
		return errors.New("invalid password")
	}

	if !account.Enabled {
		return fmt.Errorf("account disabled")
	}

	if !account.HasCapability(accounts.AccountCapabilityLogin) {
		return fmt.Errorf("user does not have capability to login")
	}
	return nil
}
