package session

import (
	"context"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
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
	kubeClient       kubernetes.KubernetesConnector
	contentProcessor ContentProcessor
	cachedSecret     *corev1.Secret
	l                *zap.SugaredLogger
}

// NewBlocklist creates a new block list
func NewBlocklist(ctx context.Context, kubeClient kubernetes.KubernetesConnector, logger *zap.SugaredLogger) (Blocklist, error) {
	// read the existing blocklist token or create it
	secret, err := kubeClient.GetSecret(ctx, common.SystemNamespace, common.EverestBlocklistSecretName)
	if err != nil {
		if !k8serrors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to get secret: %w", err)
		}
		var createErr error
		secret, createErr = kubeClient.CreateSecret(ctx, blockListSecretTemplate(""))
		if createErr != nil {
			return nil, fmt.Errorf("failed to create secret: %w", createErr)
		}
	}
	return &blocklist{
		kubeClient:       kubeClient,
		contentProcessor: newContentProcessor(secret),
		l:                logger,
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
		secret, err := b.kubeClient.GetSecret(ctx, common.SystemNamespace, common.EverestBlocklistSecretName)
		if err != nil {
			b.l.Errorf("failed to get %s secret: %v", common.EverestBlocklistSecretName, err)
			return err
		}

		secret, ok := b.contentProcessor.Block(b.l, secret, shortenedToken)
		if !ok {
			b.l.Infof("failed to block token, retrying")
			continue
		}
		updatedSecret, updateErr := b.kubeClient.UpdateSecret(ctx, secret)
		if updateErr != nil {
			b.l.Errorf("failed to update %s secret, retrying: %v", common.EverestBlocklistSecretName, updateErr)
			continue
		}
		b.contentProcessor.UpdateCache(updatedSecret)
		return nil
	}
	return nil
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

	return b.contentProcessor.IsBlocked(shortenedToken), nil
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
