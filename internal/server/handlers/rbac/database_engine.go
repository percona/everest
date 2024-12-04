package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListDatabaseEngines(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return nil, nil
}

func (h *rbacHandler) GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateDatabaseEngine(ctx context.Context, user string, req *everestv1alpha1.DatabaseEngine) error {
	return nil
}

func (h *rbacHandler) GetUpgradePlan(ctx context.Context, user, namespace, name string) (*api.UpgradePlan, error) {
	return nil, nil
}

func (h *rbacHandler) ApproveUpgradePlan(ctx context.Context, user, namespace string) error {
	return nil
}
