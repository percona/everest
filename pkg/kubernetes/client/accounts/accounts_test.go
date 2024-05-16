package accounts

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

func TestAccounts(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	c := client.NewFromFakeClient()

	// Create system namespace for testing.
	_, err := c.Clientset().
		CoreV1().
		Namespaces().
		Create(ctx, &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{Name: common.SystemNamespace},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)

	// Prepare secret.
	_, err = c.Clientset().
		CoreV1().
		Secrets(common.SystemNamespace).
		Create(ctx, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestAccountsSecretName,
				Namespace: common.SystemNamespace,
			},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)

	accounts.Tests(t, New(c))
}
