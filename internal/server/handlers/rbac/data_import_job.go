package rbac

import (
	"context"
	"errors"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

// ListDataImportJobs returns a list of DataImportJobs for the specified database clusters.
func (h *rbacHandler) ListDataImportJobs(ctx context.Context, namespace, dbName string) (*everestv1alpha1.DataImportJobList, error) {
	list, err := h.next.ListDataImportJobs(ctx, namespace, dbName)
	if err != nil {
		return nil, err
	}
	filtered := []everestv1alpha1.DataImportJob{}
	for _, job := range list.Items {
		if err := h.enforce(ctx, rbac.ResourceDataImportJobs,
			rbac.ActionRead, rbac.ObjectName(namespace, job.Spec.TargetClusterName),
		); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, err
		}
		filtered = append(filtered, job)
	}
	list.Items = filtered
	return list, nil
}
