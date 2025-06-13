package validation

import (
	"context"
	"errors"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListDatabaseEngines(ctx context.Context, cluster, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return h.next.ListDatabaseEngines(ctx, cluster, namespace)
}

func (h *validateHandler) GetDatabaseEngine(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return h.next.GetDatabaseEngine(ctx, cluster, namespace, name)
}

func (h *validateHandler) UpdateDatabaseEngine(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error) {
	if err := validateMetadata(req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.UpdateDatabaseEngine(ctx, cluster, req)
}

func (h *validateHandler) GetUpgradePlan(ctx context.Context, cluster, namespace string) (*api.UpgradePlan, error) {
	return h.next.GetUpgradePlan(ctx, cluster, namespace)
}

func (h *validateHandler) ApproveUpgradePlan(ctx context.Context, cluster, namespace string) error {
	return h.next.ApproveUpgradePlan(ctx, cluster, namespace)
}
