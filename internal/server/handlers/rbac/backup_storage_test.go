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
		t.Parallel()
		next := handlers.MockHandler{}
		h := &rbacHandler{
			next: &next,
			log:  zap.NewNop().Sugar(),
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

		testCases := []struct {
			policy string
			outLen int
		}{
			{
				policy: newPolicy(
					"p, role:test, backup-storages, read, default/backup-storage-1",
					"g, test-user, role:test",
				),
				outLen: 1,
			},
			{
				policy: newPolicy(
					"p, role:test, backup-storages, read, default/*",
					"g, test-user, role:test",
				),
				outLen: 1,
			},
			{
				policy: newPolicy(),
				outLen: 0,
			},
		}

		var err error
		ctx := context.Background()
		for _, tc := range testCases {
			h.enforcer, err = rbac.NewIOReaderEnforcer(strings.NewReader(tc.policy))
			require.NoError(t, err)

			list, err := h.ListBackupStorages(ctx, "test-user", "default")
			require.NoError(t, err)
			assert.Len(t, list.Items, tc.outLen)
		}
	})

	t.Run("GetBackupStorage", func(t *testing.T) {
		t.Parallel()
		next := handlers.MockHandler{}
		h := &rbacHandler{
			next: &next,
			log:  zap.NewNop().Sugar(),
		}
		next.On("GetBackupStorage", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
			&everestv1alpha1.BackupStorage{}, nil,
		)

		testCases := []struct {
			policy  string
			wantErr error
		}{
			{
				policy: newPolicy(
					"p, role:test, backup-storages, *, */*",
					"g, test-user, role:test",
				),
			},
			{
				policy: newPolicy(
					"p, role:test, backup-storages, *, default/*",
					"g, test-user, role:test",
				),
			},
			{
				policy: newPolicy(
					"p, role:test, backup-storages, read, default/*",
					"g, test-user, role:test",
				),
			},
			{
				policy: newPolicy(
					"p, role:test, backup-storages, read, default/inaccessible-storage",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				policy: newPolicy(
					"p, role:test, backup-storages, read, kube-system/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
		}

		var err error
		for _, tc := range testCases {
			h.enforcer, err = rbac.NewIOReaderEnforcer(strings.NewReader(tc.policy))
			require.NoError(t, err)

			_, err := h.GetBackupStorage(context.Background(), "test-user", "default", "backup-storage-1")
			assert.ErrorIs(t, err, tc.wantErr)
		}
	})
}

func newPolicy(lines ...string) string {
	return strings.Join(lines, "\n")
}
