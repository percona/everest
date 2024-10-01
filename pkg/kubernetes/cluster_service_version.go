package kubernetes

import (
	"context"
	"fmt"

	goversion "github.com/hashicorp/go-version"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"k8s.io/apimachinery/pkg/util/wait"
)

// WaitForCSVSucceeded waits until CSV phase is "succeeded".
func (k *Kubernetes) WaitForCSVSucceeded(ctx context.Context, namespace, name string) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		csv, err := k.client.GetCSV(ctx, namespace, name)
		if err != nil {
			k.l.Debugf("Could not retrieve CSV: %s", err)
			return false, nil
		}

		if csv.Status.Phase != olmv1alpha1.CSVPhaseSucceeded {
			k.l.Debugf("CSV is not succeeded. Phase: %s", csv.Status.Phase)
			return false, nil
		}

		return true, nil
	})
}

// CSVNameFromOperator returns CSV name based on operator and version.
func (k *Kubernetes) CSVNameFromOperator(operatorName string, version *goversion.Version) string {
	return fmt.Sprintf("%s.v%s", operatorName, version)
}
