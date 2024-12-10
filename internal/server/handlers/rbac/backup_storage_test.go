package rbac

import (
	"context"
	"strings"
	"testing"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/rbac"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestRBAC_BackupStorage(t *testing.T) {
	t.Parallel()

	t.Run("ListBackupStorages", func(t *testing.T) {
		policy := "p, admin, backup-storages, read, default/backup-storage-1"
		enf, err := rbac.NewIOReaderEnforcer(strings.NewReader(policy))
		require.NoError(t, err)

		next := handlers.MockHandler{}
		h := &rbacHandler{
			next:     &next,
			enforcer: enf,
			log:      zap.NewNop().Sugar(),
		}

		next.On("ListBackupStorages",
			mock.Anything,
			mock.Anything,
			mock.Anything).Return(
			&everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "backup-storage-1",
							Namespace: "default",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "backup-storage-2",
							Namespace: "default",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "backup-storage-3",
							Namespace: "default",
						},
					},
				},
			},
			nil,
		)
		ctx := context.Background()
		list, err := h.ListBackupStorages(ctx, "admin", "default")
		require.NoError(t, err)
		assert.Len(t, list.Items, 1)
		assert.Equal(t, "backup-storage-1", list.Items[0].GetName())
		assert.Equal(t, "default", list.Items[0].GetNamespace())
	})
}
