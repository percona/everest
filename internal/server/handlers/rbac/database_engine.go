package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListDatabaseEngines(ctx context.Context, user, namespace string) (*api.DatabaseEngineList, error) {
	return nil, nil
}

func (h *rbacHandler) GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*api.DatabaseEngine, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateDatabaseEngine(ctx context.Context, user string, req *api.DatabaseEngine) error {
	return nil
}

func (h *rbacHandler) GetUpgradePlan(ctx context.Context, user, namespace, name string) (*api.UpgradePlan, error) {
	return nil, nil
}

func (h *rbacHandler) ApproveUpgradePlan(ctx context.Context, user, namespace string) error {
	return nil
}
