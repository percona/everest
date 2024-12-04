package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *rbacHandler) ListMonitoringInstances(ctx context.Context, user, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return nil, nil
}

func (h *rbacHandler) CreateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error {
	return nil
}

func (h *rbacHandler) DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *rbacHandler) GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error {
	return nil
}
