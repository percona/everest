package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *k8sHandler) ListDatabaseEngines(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return h.kubeClient.ListDatabaseEngines(ctx, namespace)
}

func (h *k8sHandler) GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return h.kubeClient.GetDatabaseEngine(ctx, namespace, name)
}

func (h *k8sHandler) UpdateDatabaseEngine(ctx context.Context, user string, req *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error) {
	return nil, nil
}

func (h *k8sHandler) GetUpgradePlan(ctx context.Context, user, namespace string) (*api.UpgradePlan, error) {
	return nil, nil
}

func (h *k8sHandler) ApproveUpgradePlan(ctx context.Context, user, namespace string) error {
	return nil
}
