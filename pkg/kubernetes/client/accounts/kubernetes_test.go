package accounts

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

func TestAccounts(t *testing.T) {
	t.Parallel()
	c := client.NewFromFakeClient()
	ctx := context.Background()

	// Create system namespace for testing.
	_, err := c.Clientset().
		CoreV1().
		Namespaces().
		Create(ctx, &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{Name: common.SystemNamespace},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)
	// Prepare configmap.
	_, err = c.Clientset().
		CoreV1().
		ConfigMaps(common.SystemNamespace).
		Create(ctx, &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestAccountsConfigName,
				Namespace: common.SystemNamespace,
			},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)
	// Prepare secret.
	_, err = c.Clientset().
		CoreV1().
		Secrets(common.SystemNamespace).
		Create(ctx, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestAccountsConfigName,
				Namespace: common.SystemNamespace,
			},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)

	mgr := New(c)

	// Assert that initially there are no accounts.
	accounts, err := mgr.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, accounts)

	// Create user1
	err = mgr.Create(ctx, "user1", "password")
	require.NoError(t, err)

	// Check that a new account is created.
	accounts, err = mgr.List(ctx)
	require.NoError(t, err)
	assert.Len(t, accounts, 1)
	assert.Equal(t, "user1", accounts[0].ID)
	assert.True(t, accounts[0].Enabled)
	assert.NotEmpty(t, accounts[0].Password.PasswordHash)
	assert.NotEmpty(t, accounts[0].Password.PasswordMTime)
	user1, err := mgr.Get(ctx, "user1")
	require.NoError(t, err)
	assert.Equal(t, "user1", user1.ID)
	assert.True(t, user1.Enabled)
	assert.NotEmpty(t, user1.Password.PasswordHash)
	assert.NotEmpty(t, user1.Password.PasswordMTime)

	passwordhash := user1.Password.PasswordHash

	// Update password of user1.
	err = mgr.Update(ctx, "user1", "new-password")
	require.NoError(t, err)
	user1, err = mgr.Get(ctx, "user1")
	require.NoError(t, err)
	assert.NotEqual(t, passwordhash, user1.Password.PasswordHash)

	// Delete non-existing user.
	err = mgr.Delete(ctx, "not-existing")
	require.Error(t, err)
	require.ErrorIs(t, err, ErrAccountNotFound)

	// Delete user1.
	err = mgr.Delete(ctx, "user1")
	require.NoError(t, err)

	// Check that no users exists.
	accounts, err = mgr.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, accounts)
}
