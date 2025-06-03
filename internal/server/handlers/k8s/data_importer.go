package k8s

import (
	"context"
	"slices"

	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDataImporters returns a list of DataImporters that support the specified engines.
func (h *k8sHandler) ListDataImporters(ctx context.Context, supportedEngines ...string) (*everestv1alpha1.DataImporterList, error) {
	result := &everestv1alpha1.DataImporterList{}
	list, err := h.kubeConnector.ListDataImporters(ctx, &ctrlclient.ListOptions{})
	if err != nil {
		return nil, err
	}

	// filter the list based on the engines.
	for _, wantEngine := range supportedEngines {
		for _, importer := range list.Items {
			if slices.Contains(importer.Spec.SupportedEngines, everestv1alpha1.EngineType(wantEngine)) {
				result.Items = append(result.Items, importer)
			}
		}
	}
	return result, nil
}
