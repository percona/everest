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
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
)

const (
	// SessionManagerClaimsIssuer fills the "iss" field of the token.
	SessionManagerClaimsIssuer = "everest"
	// KeyID contains the key ID for the JWT token.
	KeyID = "everest"
)

// Manager provides functionality for creating and managing JWT tokens.
type Manager struct {
	accountManager accounts.Interface
	signingKey     *rsa.PrivateKey
}

// Option is a function that modifies a SessionManager.
type Option func(*Manager)

// New creates a new session manager with the given options.
func New(options ...Option) (*Manager, error) {
	m := &Manager{}
	for _, opt := range options {
		opt(m)
	}
	privKey, err := getPrivateKey()
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get private key"))
	}
	m.signingKey = privKey
	return m, nil
}

// WithAccountManager sets the account manager to use for verifying user credentials.
func WithAccountManager(i accounts.Interface) Option {
	return func(m *Manager) {
		m.accountManager = i
	}
}

// Create creates a new token for a given subject (user) and returns it as a string.
// Passing a value of `0` for secondsBeforeExpiry creates a token that never expires.
// The id parameter holds an optional unique JWT token identifier and stored as a standard claim "jti" in the JWT token.
func (mgr *Manager) Create(subject string, secondsBeforeExpiry int64, id string) (string, error) {
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

func (mgr *Manager) signClaims(claims jwt.Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = KeyID
	return token.SignedString(mgr.signingKey)
}

// Authenticate verifies the given username and password.
func (mgr *Manager) Authenticate(ctx context.Context, username string, password string) error {
	if password == "" {
		return fmt.Errorf("blank passwords are not allowed")
	}

	if err := mgr.accountManager.Verify(ctx, username, password); err != nil {
		return err
	}

	account, err := mgr.accountManager.Get(ctx, username)
	if err != nil {
		return err
	}

	if !account.Enabled {
		return accounts.ErrAccountDisabled
	}

	if !account.HasCapability(accounts.AccountCapabilityLogin) {
		return errors.Join(accounts.ErrInsufficientCapabilities, errors.New("user does not have capability to login"))
	}
	return nil
}

func getPrivateKey() (*rsa.PrivateKey, error) {
	pemString, err := os.ReadFile(common.EverestJWTPrivateKeyFile)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to read JWT private key"))
	}
	block, _ := pem.Decode(pemString)
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

// KeyFunc retruns a function for getting the public RSA keys used
// for verifying the JWT tokens signed by everest.
func (mgr *Manager) KeyFunc() jwt.Keyfunc {
	return func(_ *jwt.Token) (interface{}, error) {
		return mgr.signingKey.Public(), nil
	}
}
