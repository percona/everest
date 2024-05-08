package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
)

// SetJWTToken sets the provided JWT token in the everest-jwt secret.
func (k *Kubernetes) SetJWTToken(ctx context.Context, token string) error {
	// Check if the secret exists?
	exists := false
	secret, err := k.GetSecret(ctx, common.SystemNamespace, common.EverestJWTSecretName)
	if err == nil {
		exists = true
	} else if !errors.IsNotFound(err) {
		return err
	}

	// Create secret if it doesn't exists.
	if !exists {
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestJWTSecretName,
				Namespace: common.SystemNamespace,
			},
			Data: map[string][]byte{
				common.EverestJWTSecretKey: []byte(token),
			},
		}
		if _, err := k.CreateSecret(ctx, secret); err != nil {
			return err
		}
		// Restart the deployment to pick up the new secret.
		return k.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
	}

	// Otherwise, update the secret.
	secret.Data[common.EverestJWTSecretKey] = []byte(token)
	if _, err := k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	// Restart the deployment to pick up the new secret.
	return k.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
}

// GetJWTToken returns the JWT token from the everest-jwt secret.
func (k *Kubernetes) GetJWTToken(ctx context.Context) (string, error) {
	secret, err := k.GetSecret(ctx, common.SystemNamespace, common.EverestJWTSecretName)
	if err != nil {
		return "", err
	}
	return string(secret.Data[common.EverestJWTSecretKey]), nil
}
