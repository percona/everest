package rbac

import (
	"context"
	"testing"

	"github.com/percona/everest/api"
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

func TestRBAC_MonitoringInstance(t *testing.T) {
	t.Parallel()

	data := func() *handlers.MockHandler {
		next := handlers.MockHandler{}
		next.On("ListMonitoringInstances",
			mock.Anything,
			mock.Anything,
		).Return(
			&everestv1alpha1.MonitoringConfigList{
				Items: []everestv1alpha1.MonitoringConfig{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "monitoring-instance-1",
							Namespace: "default",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "monitoring-instance-2",
							Namespace: "default",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "monitoring-instance-3",
							Namespace: "default",
						},
					},
				},
			},
			nil,
		)
		return &next
	}

	t.Run("ListMonitoringInstances", func(t *testing.T) {
		t.Parallel()

		testCases := []struct {
			desc   string
			policy string
			outLen int
		}{
			{
				desc: "read-only for monitoring-instance-1 in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
				outLen: 1,
			},
			{
				desc: "read-only for monitoring-instance-1 and monitoring-instance-2 only in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/monitoring-instance-1",
					"p, role:test, monitoring-instances, read, default/monitoring-instance-2",
					"g, test-user, role:test",
				),
				outLen: 2,
			},
			{
				desc: "read-only for all in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/*",
					"g, test-user, role:test",
				),
				outLen: 3,
			},
			{
				desc: "read-only for all in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, */*",
					"g, test-user, role:test",
				),
				outLen: 3,
			},
			{
				desc:   "no policy",
				policy: newPolicy(),
				outLen: 0,
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
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

				list, err := h.ListMonitoringInstances(ctx, "default")
				require.NoError(t, err)
				assert.Len(t, list.Items, tc.outLen)
			})
		}
	})

	t.Run("GetMonitoringInstance", func(t *testing.T) {
		t.Parallel()

		next := func() *handlers.MockHandler {
			next := handlers.MockHandler{}
			next.On("GetMonitoringInstance", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
				&everestv1alpha1.MonitoringConfig{}, nil,
			)
			return &next
		}

		testCases := []struct {
			desc    string
			policy  string
			wantErr error
		}{
			{
				desc: "all actions for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "read-only for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "read-only for 'inaccessible-cfg' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/inaccessible-cfg",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read-only for all monitoring-instances in kube-system namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, kube-system/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)

				next := next()

				h := &rbacHandler{
					next:       next,
					log:        zap.NewNop().Sugar(),
					enforcer:   enf,
					userGetter: testUserGetter,
				}
				_, err = h.GetMonitoringInstance(ctx, "default", "monitoring-instance-1")
				assert.ErrorIs(t, err, tc.wantErr)
			})
		}
	})

	t.Run("CreateMonitoringInstance", func(t *testing.T) {
		t.Parallel()
		next := func() *handlers.MockHandler {
			next := handlers.MockHandler{}
			next.On("CreateMonitoringInstance", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
				&everestv1alpha1.MonitoringConfig{}, nil,
			)
			return &next
		}

		testCases := []struct {
			desc    string
			policy  string
			wantErr error
		}{
			{
				desc: "all actions for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "create only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "create only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "create only action for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "update only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "update only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "update only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)
				next := next()

				h := &rbacHandler{
					next:       next,
					log:        zap.NewNop().Sugar(),
					enforcer:   enf,
					userGetter: testUserGetter,
				}
				_, err = h.CreateMonitoringInstance(ctx, "default", &api.CreateMonitoringInstanceJSONRequestBody{
					Name: "monitoring-instance-1",
				})
				assert.ErrorIs(t, err, tc.wantErr)
			})
		}
	})

	t.Run("UpdateMonitoringInstance", func(t *testing.T) {
		t.Parallel()
		next := func() *handlers.MockHandler {
			next := handlers.MockHandler{}
			next.On("UpdateMonitoringInstance", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
				&everestv1alpha1.MonitoringConfig{}, nil,
			)
			return &next
		}

		testCases := []struct {
			desc    string
			policy  string
			wantErr error
		}{
			{
				desc: "all actions for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "update only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "update only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "update only action for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "read only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "delete only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)
				next := next()

				h := &rbacHandler{
					next:       next,
					log:        zap.NewNop().Sugar(),
					enforcer:   enf,
					userGetter: testUserGetter,
				}
				_, err = h.UpdateMonitoringInstance(ctx, "default", "monitoring-instance-1", &api.MonitoringInstanceUpdateParams{})
				assert.ErrorIs(t, err, tc.wantErr)
			})
		}
	})

	t.Run("DeleteMonitoringInstance", func(t *testing.T) {
		t.Parallel()
		next := func() *handlers.MockHandler {
			next := handlers.MockHandler{}
			next.On("DeleteMonitoringInstance", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			return &next
		}

		testCases := []struct {
			desc    string
			policy  string
			wantErr error
		}{
			{
				desc: "all actions for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "all actions for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, *, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "delete only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, */*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "delete only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/*",
					"g, test-user, role:test",
				),
			},
			{
				desc: "delete only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, delete, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
			},
			{
				desc: "update only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "update only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "update only action for 'monitoring-instance-1' in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, update, default/monitoring-instance-1",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "read only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, read, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for all monitoring-instances in all namespaces",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, */*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for all monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/*",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
			{
				desc: "create only action for some monitoring-instances in default namespace",
				policy: newPolicy(
					"p, role:test, monitoring-instances, create, default/some",
					"g, test-user, role:test",
				),
				wantErr: ErrInsufficientPermissions,
			},
		}

		ctx := context.WithValue(context.Background(), common.UserCtxKey, "test-user")
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				k8sMock := newConfigMapMock(tc.policy)
				enf, err := rbac.NewEnforcer(ctx, k8sMock, zap.NewNop().Sugar())
				require.NoError(t, err)
				next := next()

				h := &rbacHandler{
					next:       next,
					log:        zap.NewNop().Sugar(),
					enforcer:   enf,
					userGetter: testUserGetter,
				}
				err = h.DeleteMonitoringInstance(ctx, "default", "monitoring-instance-1")
				assert.ErrorIs(t, err, tc.wantErr)
			})
		}
	})
}
