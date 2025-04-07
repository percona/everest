package session

import (
	"context"

	"github.com/golang-jwt/jwt/v5"
	"github.com/pkg/errors"
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
	Allow(ctx context.Context) (bool, error)
}

type blocklist struct {
	secretsManager SecretsManager
	content        Content
	l              *zap.SugaredLogger
}

type SecretsManager interface {
	// GetSecret returns a secret by name.
	GetSecret(ctx context.Context, namespace, name string) (*corev1.Secret, error)
	// CreateSecret creates a secret.
	CreateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	// UpdateSecret updates a secret.
	UpdateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
}

type Content interface {
	Add(l *zap.SugaredLogger, secret *corev1.Secret, tokenData string) (*corev1.Secret, bool)
	IsIn(secret *corev1.Secret, tokenData string) bool
}

func (b *blocklist) Add(ctx context.Context, token *jwt.Token) error {
	shrunkToken, err := shrinkToken(token)
	if err != nil {
		return err
	}

	for attempts := 0; attempts < maxRetries; attempts++ {
		secret, err := b.secretsManager.GetSecret(ctx, common.SystemNamespace, common.EverestBlocklistSecretName)
		if err != nil {
			if k8serrors.IsNotFound(err) {
				_, err = b.secretsManager.CreateSecret(ctx, blockListSecretTemplate(shrunkToken))
				if err != nil {
					b.l.Errorf("failed to create %s secret: %v", common.EverestBlocklistSecretName, err)
					continue
				}
				return nil
			}
		}
		secret, retryNeeded := b.content.Add(b.l, secret, shrunkToken)
		if retryNeeded {
			continue
		}
		if _, err := b.secretsManager.UpdateSecret(ctx, secret); err != nil {
			b.l.Errorf("failed to update %s secret: %v", common.EverestBlocklistSecretName, err)
			continue
		}
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

func (b *blocklist) Allow(ctx context.Context) (bool, error) {
	token, ok := ctx.Value(common.UserCtxKey).(*jwt.Token)
	if !ok {
		return false, errors.New("failed to get token from context")
	}

	secret, err := b.secretsManager.GetSecret(ctx, common.SystemNamespace, common.EverestBlocklistSecretName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return true, nil
		}
		return false, errors.Wrap(err, "failed to get secret")
	}

	shrunkToken, err := shrinkToken(token)
	if err != nil {
		return false, errors.Wrap(err, "failed to shrink token")
	}

	return !b.content.IsIn(secret, shrunkToken), nil
}

func NewBlocklist(secretsManager SecretsManager, logger *zap.SugaredLogger) Blocklist {
	return &blocklist{
		secretsManager: secretsManager,
		content:        newDataProcessor(),
		l:              logger,
	}
}
