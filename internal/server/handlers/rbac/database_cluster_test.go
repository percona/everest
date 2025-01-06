package rbac

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/rbac"
)

func TestRBAC_DatabaseCluster(t *testing.T) {
	t.Parallel()

	t.Run("CreateDatabaseCluster", func(t *testing.T) {
		testCases := []struct {
			desc    string
			wantErr error
			policy  string
		}{
			{
				desc:    "missing create permission for database-cluster",
				policy:  newPolicy(), // no policy
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing create permission for database-cluster (wrong namespace)",
				policy: newPolicy(
					"p, role:test, database-clusters, create, some/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing create permission for database-cluster (wrong object)",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing read permissions for database-engine",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing create database-cluster-backups permissions",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing read backup-storages permissions",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing create database-cluster-restore permissions",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/test-backup-storage",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing database-cluster-credentials permissions on source cluster",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/test-backup-storage",
					"p, role:test, database-cluster-restores, create, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing read database-cluster-backups permissions on source cluster",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/test-backup-storage",
					"p, role:test, database-cluster-restores, create, default/*",
					"p, role:test, database-cluster-credentials, read, default/source-cluster",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "missing read database-cluster-restores permissions on source cluster",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/test-backup-storage",
					"p, role:test, database-cluster-restores, create, default/*",
					"p, role:test, database-cluster-credentials, read, default/source-cluster",
					"p, role:test, database-cluster-backups, read, default/source-cluster",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "success",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/test",
					"p, role:test, database-engines, read, default/percona-xtradb-cluster-operator",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/test-backup-storage",
					"p, role:test, database-cluster-restores, create, default/*",
					"p, role:test, database-cluster-credentials, read, default/source-cluster",
					"p, role:test, database-cluster-backups, read, default/source-cluster",
					"p, role:test, database-cluster-restores, read, default/source-cluster",
					"g, test-user, role:test",
				),
			},
			{
				desc: "success (wildcards)",
				policy: newPolicy(
					"p, role:test, database-clusters, create, default/*",
					"p, role:test, database-engines, read, default/*",
					"p, role:test, database-cluster-backups, create, default/*",
					"p, role:test, backup-storages, read, default/*",
					"p, role:test, database-cluster-restores, create, default/*",
					"p, role:test, database-cluster-credentials, read, default/*",
					"p, role:test, database-cluster-backups, read, default/*",
					"p, role:test, database-cluster-restores, read, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "success (admin)",
				policy: newPolicy(
					"g, test-user, role:admin",
				),
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)

				next := &handlers.MockHandler{}
				next.On("GetDatabaseClusterBackup", mock.Anything, mock.Anything, mock.Anything).Return(
					&everestv1alpha1.DatabaseClusterBackup{
						Spec: everestv1alpha1.DatabaseClusterBackupSpec{
							DBClusterName: "source-cluster",
						},
					}, nil)
				next.On("CreateDatabaseCluster", mock.Anything, mock.Anything).
					Return(&everestv1alpha1.DatabaseCluster{}, nil)

				h := &rbacHandler{
					next:       next,
					enforcer:   enf,
					log:        zap.NewNop().Sugar(),
					userGetter: testUserGetter,
				}
				_, err = h.CreateDatabaseCluster(ctx, &everestv1alpha1.DatabaseCluster{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test",
						Namespace: "default",
					},
					Spec: everestv1alpha1.DatabaseClusterSpec{
						Engine: everestv1alpha1.Engine{
							Type: everestv1alpha1.DatabaseEnginePXC,
						},
						Backup: everestv1alpha1.Backup{
							Schedules: []everestv1alpha1.BackupSchedule{
								{
									BackupStorageName: "test-backup-storage",
								},
							},
						},
						DataSource: &everestv1alpha1.DataSource{
							DBClusterBackupName: "test-backup",
						},
					},
				})
				assert.ErrorIs(t, err, tc.wantErr)
			})
		}
	})
}
