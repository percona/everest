package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListMonitoringInstances(ctx context.Context, user, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return h.next.ListMonitoringInstances(ctx, user, namespace)
}

func (h *validateHandler) CreateMonitoringInstance(ctx context.Context, user, namespace string, req *api.CreateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	return h.next.CreateMonitoringInstance(ctx, user, namespace, req)
}

func (h *validateHandler) DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error {
	return h.next.DeleteMonitoringInstance(ctx, user, namespace, name)
}

func (h *validateHandler) GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return h.next.GetMonitoringInstance(ctx, user, namespace, name)
}

func (h *validateHandler) UpdateMonitoringInstance(ctx context.Context, user, namespace, name string, req *api.UpdateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	return h.next.UpdateMonitoringInstance(ctx, user, namespace, name, req)
}
