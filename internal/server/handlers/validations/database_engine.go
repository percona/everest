package rbac

import (
	"context"
	"errors"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListDatabaseEngines(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return h.next.ListDatabaseEngines(ctx, user, namespace)
}

func (h *validateHandler) GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return h.next.GetDatabaseEngine(ctx, user, namespace, name)
}

func (h *validateHandler) UpdateDatabaseEngine(ctx context.Context, user string, req *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error) {
	if err := validateMetadata(req); err != nil {
		return nil, errors.Join(errInvalidRequest, err)
	}
	return h.next.UpdateDatabaseEngine(ctx, user, req)
}

func (h *validateHandler) GetUpgradePlan(ctx context.Context, user, namespace string) (*api.UpgradePlan, error) {
	return h.next.GetUpgradePlan(ctx, user, namespace)
}

func (h *validateHandler) ApproveUpgradePlan(ctx context.Context, user, namespace string) error {
	return h.next.ApproveUpgradePlan(ctx, user, namespace)
}
