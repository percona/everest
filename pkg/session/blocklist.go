package session

import (
	"context"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	dataKey    = "list"
	maxRetries = 10
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
	Add(ctx context.Context, shortenedToken string) error
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

	for attempts := 0; attempts < maxRetries; attempts++ {
		if err := b.tokenStore.Add(ctx, shortenedToken); err != nil {
			b.l.Errorf("failed to add token to the blocklist: %v", err)
			continue
		}
		return nil
	}
	return fmt.Errorf("failed to block token after %d attempts", maxRetries)
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

func blockListSecretTemplate(stringData string) *corev1.Secret {
	return &corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Secret",
			APIVersion: "v1",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestBlocklistSecretName,
			Namespace: common.SystemNamespace,
		},
		StringData: map[string]string{
			dataKey: stringData,
		},
	}
}
