package kubernetes

import (
	"context"
	"errors"

	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// GetInstallPlan retrieves an OLM install plan that matches the criteria.
func (k *Kubernetes) GetInstallPlan(ctx context.Context, key ctrlclient.ObjectKey) (*olmv1alpha1.InstallPlan, error) {
	k.rcLock.Lock()
	defer k.rcLock.Unlock()

	result := &olmv1alpha1.InstallPlan{}
	if err := k.k8sClient.Get(ctx, key, result); err != nil {
		return nil, err
	}
	return result, nil
}

// UpdateInstallPlan updates OLM install plan.
func (k *Kubernetes) UpdateInstallPlan(ctx context.Context, installPlan *olmv1alpha1.InstallPlan) (*olmv1alpha1.InstallPlan, error) {
	if err := k.k8sClient.Update(ctx, installPlan); err != nil {
		return nil, err
	}
	return installPlan, nil
}

// ApproveInstallPlan approves OLM install plan that matches the criteria.
func (k *Kubernetes) ApproveInstallPlan(ctx context.Context, key ctrlclient.ObjectKey) (bool, error) {
	ip, err := k.GetInstallPlan(ctx, key)
	if err != nil {
		return false, err
	}

	k.l.Debugf("Approving install plan='%s' in namespace='%s'", key.Name, key.Namespace)

	ip.Spec.Approved = true
	_, err = k.UpdateInstallPlan(ctx, ip)
	if err != nil {
		var sErr *apierrors.StatusError
		if ok := errors.As(err, &sErr); ok && sErr.Status().Reason == metav1.StatusReasonConflict {
			// The installation plan has changed. We retry to get an updated install plan.
			k.l.Debugf("Retrying install plan update due to a version conflict. Error: %s", err)
			return false, nil
		}

		return false, err
	}

	return true, nil
}
