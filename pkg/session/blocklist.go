package session

import (
	"context"
	"fmt"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/informer"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
)

const (
	dataKey    = "list"
	maxRetries = 10
)

type Blocklist interface {
	Add(ctx context.Context, token *jwt.Token) error
	IsAllowed(ctx context.Context) (bool, error)
}

type blocklist struct {
	kubeClient   kubernetes.KubernetesConnector
	content      ContentProcessor
	informer     *informer.Informer
	cachedSecret *corev1.Secret
	l            *zap.SugaredLogger
}

type ContentProcessor interface {
	Add(l *zap.SugaredLogger, secret *corev1.Secret, tokenData string) (*corev1.Secret, bool)
	IsBlocked(shortenedToken string) bool
	UpdateCache(secret *corev1.Secret)
}

func (b *blocklist) Add(ctx context.Context, token *jwt.Token) error {
	shortenedToken, err := shortenToken(token)
	if err != nil {
		return err
	}

	for attempts := 0; attempts < maxRetries; attempts++ {
		secret, err := b.kubeClient.GetSecret(ctx, common.SystemNamespace, common.EverestBlocklistSecretName)
		if err != nil {
			if k8serrors.IsNotFound(err) {
				_, err = b.kubeClient.CreateSecret(ctx, blockListSecretTemplate(shortenedToken))
				if err != nil {
					b.l.Errorf("failed to create %s secret: %v", common.EverestBlocklistSecretName, err)
					continue
				}
				return nil
			}
		}
		b.cachedSecret = secret
		secret, retryNeeded := b.content.Add(b.l, secret, shortenedToken)
		if retryNeeded {
			continue
		}
		updatedSecret, updateErr := b.kubeClient.UpdateSecret(ctx, secret)
		if updateErr != nil {
			b.l.Errorf("failed to update %s secret: %v", common.EverestBlocklistSecretName, updateErr)
			continue
		}
		b.content.UpdateCache(updatedSecret)
		return nil
	}
	return nil
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

func (b *blocklist) IsAllowed(ctx context.Context) (bool, error) {
	token, ok := ctx.Value(common.UserCtxKey).(*jwt.Token)
	if !ok {
		return false, fmt.Errorf("failed to get token from context")
	}

	shortenedToken, err := shortenToken(token)
	if err != nil {
		return false, fmt.Errorf("failed to shorten token: %w", err)
	}

	return !b.content.IsBlocked(shortenedToken), nil
}

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
		kubeClient: kubeClient,
		content:    newContentProcessor(secret),
		l:          logger,
	}, nil
}
