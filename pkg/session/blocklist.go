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
	"context"
	"fmt"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	dataKey         = "list"
	maxRetries      = 10
	backoffInterval = 500 * time.Millisecond
)

// Blocklist represents interface to block JWT tokens and check if a token is blocked.
type Blocklist interface {
	// Block invalidates the token from the context by adding it to blocklist.
	Block(ctx context.Context) error
	// IsBlocked checks if the token from the context is blocked.
	IsBlocked(ctx context.Context) (bool, error)
}

type blocklist struct {
	tokenStore TokenStore
	l          *zap.SugaredLogger
}

type TokenStore interface {
	// Add adds the shortened token to the blocklist
	Add(ctx context.Context, shortenedToken string) error
	// Exists checks if the shortened token is in the blocklist
	Exists(ctx context.Context, shortenedToken string) (bool, error)
}

// NewBlocklist creates a new block list
func NewBlocklist(ctx context.Context, kubeClient kubernetes.KubernetesConnector, logger *zap.SugaredLogger) (Blocklist, error) {
	store, err := newTokenStore(ctx, kubeClient, logger)
	if err != nil {
		return nil, err
	}
	return &blocklist{
		tokenStore: store,
		l:          logger,
	}, nil
}

// Block invalidates the token from the context by adding it to blocklist.
func (b *blocklist) Block(ctx context.Context) error {
	token, err := extractToken(ctx)
	if err != nil {
		return err
	}
	shortenedToken, err := shortenToken(token)
	if err != nil {
		return err
	}

	var bOff backoff.BackOff
	bOff = backoff.NewConstantBackOff(backoffInterval)
	bOff = backoff.WithMaxRetries(bOff, maxRetries)
	bOff = backoff.WithContext(bOff, ctx)
	return backoff.Retry(
		func() error {
			return b.tokenStore.Add(ctx, shortenedToken)
		},
		bOff,
	)
}

// IsBlocked checks if the token from the context is blocked.
func (b *blocklist) IsBlocked(ctx context.Context) (bool, error) {
	token, err := extractToken(ctx)
	if err != nil {
		return false, err
	}
	shortenedToken, err := shortenToken(token)
	if err != nil {
		return false, fmt.Errorf("failed to shorten token: %w", err)
	}

	return b.tokenStore.Exists(ctx, shortenedToken)
}

func extractToken(ctx context.Context) (*jwt.Token, error) {
	token, ok := ctx.Value(common.UserCtxKey).(*jwt.Token)
	if !ok {
		return nil, fmt.Errorf("failed to get token from context")
	}
	return token, nil
}
