package kubernetes

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/common"
)

// CreateJWTSecret creates a new secret with the JWT singing key.
// If `force` is set to true, the secret will be re-created with a new key.
func (k *Kubernetes) CreateJWTSecret(ctx context.Context, force bool) error {
	token, err := genJWTToken()
	if err != nil {
		return errors.Join(err, errors.New("failed to generate JWT token"))
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestJWTSecretName,
			Namespace: common.SystemNamespace,
		},
		Data: map[string][]byte{
			"signing_key": []byte(token),
		},
	}

	exists := false
	if _, err := k.client.GetSecret(ctx,
		common.SystemNamespace,
		common.EverestJWTSecretName,
	); err == nil {
		exists = true
	} else if ctrlclient.IgnoreNotFound(err) != nil {
		return err
	}

	if !exists {
		if _, err := k.client.CreateSecret(ctx, secret); err != nil {
			return err
		}
		return nil
	}

	if force {
		_, err = k.client.UpdateSecret(ctx, secret)
		return err
	}
	return nil
}

func genJWTToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
