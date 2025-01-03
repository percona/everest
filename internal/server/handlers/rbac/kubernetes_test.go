package rbac

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/percona/everest/api"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/rbac"
)

func TestRBAC_Kubernetes(t *testing.T) {
	t.Parallel()

	data := func() *handlers.MockHandler {
		next := handlers.MockHandler{}
		next.On("GetUserPermissions",
			mock.Anything,
		).Return(
			&api.UserPermissions{
				Enabled: true,
			},
			nil,
		)
		return &next
	}

	t.Run("GetUserPermissions", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc     string
			user     rbac.User
			policy   string
			outPerms [][]string
		}{
			{
				desc: "default admin permissions",
				user: rbac.User{
					Subject: "test-user",
				},
				policy: newPolicy(
					"g, test-user, role:admin",
				),
				outPerms: [][]string{
					{"test-user", "monitoring-instances", "*", "*/*"},
					{"test-user", "database-cluster-backups", "*", "*/*"},
					{"test-user", "database-cluster-restores", "*", "*/*"},
					{"test-user", "database-clusters", "*", "*/*"},
					{"test-user", "database-cluster-credentials", "*", "*/*"},
					{"test-user", "database-engines", "*", "*/*"},
					{"test-user", "namespaces", "*", "*"},
					{"test-user", "backup-storages", "*", "*/*"},
				},
			},
			{
				desc: "permissions from different roles are merged",
				user: rbac.User{
					Subject: "test-user",
				},
				policy: newPolicy(
					"p, test-user, database-clusters, *, */*",
					"p, role:creater, database-clusters, create, */*",
					"p, role:reader, database-clusters, read, */*",
					"p, role:updater, database-clusters, update, */*",
					"p, role:deleter, database-clusters, delete, */*",
					"g, test-user, role:creater",
					"g, test-user, role:reader",
					"g, test-user, role:updater",
					"g, another-user, role:deleter",
				),
				outPerms: [][]string{
					{"test-user", "database-clusters", "*", "*/*"},
					{"test-user", "database-clusters", "create", "*/*"},
					{"test-user", "database-clusters", "read", "*/*"},
					{"test-user", "database-clusters", "update", "*/*"},
				},
			},
			{
				desc: "permissions from different groups are merged",
				user: rbac.User{
					Subject: "test-user",
					Groups:  []string{"test-group-1", "test-group-2"},
				},
				policy: newPolicy(
					"p, test-user, database-clusters, read, */*",
					"p, test-group-1, database-clusters, create, */*",
					"p, test-group-2, database-clusters, update, */*",
					"p, test-group-3, database-clusters, delete, */*",
				),
				outPerms: [][]string{
					{"test-user", "database-clusters", "read", "*/*"},
					{"test-user", "database-clusters", "create", "*/*"},
					{"test-user", "database-clusters", "update", "*/*"},
				},
			},
			{
				desc: "duplicate permissions are removed",
				user: rbac.User{
					Subject: "test-user",
				},
				policy: newPolicy(
					"p, test-user, database-clusters, *, */*",
					"p, role:test, database-clusters, *, */*",
					"g, test-user, role:test",
				),
				outPerms: [][]string{
					{"test-user", "database-clusters", "*", "*/*"},
				},
			},
			{
				desc: "no policy",
				user: rbac.User{
					Subject: "test-user",
				},
				policy:   newPolicy(),
				outPerms: [][]string{},
			},
		}

		for _, tc := range testCases {
			ctx := context.WithValue(context.Background(), common.UserCtxKey, tc.user)
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)
				next := data()

				h := &rbacHandler{
					next:       next,
					log:        zap.NewNop().Sugar(),
					enforcer:   enf,
					userGetter: testUserGetter,
				}

				perms, err := h.GetUserPermissions(ctx)
				require.NoError(t, err)
				assert.True(t, perms.Enabled)
				assert.ElementsMatch(t, tc.outPerms, *perms.Permissions)
			})
		}
	})
}
