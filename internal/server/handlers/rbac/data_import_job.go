package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

// ListDataImportJobs returns a list of DataImportJobs for the specified database clusters.
func (h *rbacHandler) ListDataImportJobs(ctx context.Context, namespace, dbName string) (*everestv1alpha1.DataImportJobList, error) {
	if err := h.enforce(ctx, rbac.ResourceDataImportJobs, rbac.ActionRead, rbac.ObjectName(namespace, dbName)); err != nil {
		return nil, err
	}
	return h.next.ListDataImportJobs(ctx, namespace, dbName)
}
