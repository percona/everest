package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"time"

	goversion "github.com/hashicorp/go-version"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
)

func (k *Kubernetes) getInstallPlanFromSubscription(ctx context.Context, namespace, name string) (*olmv1alpha1.InstallPlan, error) {
	var subs *olmv1alpha1.Subscription

	// If the subscription was recently created, the install plan might not be ready yet.
	err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		var err error
		subs, err = k.client.GetSubscription(ctx, namespace, name)
		if err != nil {
			return false, err
		}
		if subs == nil || subs.Status.Install == nil || subs.Status.Install.Name == "" {
			return false, nil
		}

		return true, nil
	})
	if err != nil {
		return nil, err
	}
	if subs == nil || subs.Status.Install == nil || subs.Status.Install.Name == "" {
		return nil, fmt.Errorf("cannot get subscription for %q operator", name)
	}

	ip, err := k.client.GetInstallPlan(ctx, namespace, subs.Status.Install.Name)
	if err != nil {
		return nil, errors.Join(err, fmt.Errorf("cannot get install plan to upgrade %q", name))
	}

	return ip, err
}

// WaitForInstallPlan waits until an install plan for the given operator and version is available.
func (k *Kubernetes) WaitForInstallPlan(ctx context.Context, namespace, operatorName string, version *goversion.Version) (*olmv1alpha1.InstallPlan, error) {
	var ip *olmv1alpha1.InstallPlan
	csvName := k.CSVNameFromOperator(operatorName, version)
	err := wait.PollUntilContextCancel(ctx, time.Second, true, func(ctx context.Context) (bool, error) {
		k.l.Debug("Looking for install plan")
		ips, err := k.client.ListInstallPlans(ctx, namespace)
		if err != nil {
			k.l.Debugf("Could not list install plans: %s", err)
			return false, nil
		}

		for _, i := range ips.Items {
			for _, csv := range i.Spec.ClusterServiceVersionNames {
				if csv == csvName {
					//nolint:exportloopref
					ip = &i
					k.l.Debugf("Found install plan %s", i.Name)
					return true, nil
				}
			}
		}

		return false, nil
	})
	if err != nil {
		return nil, errors.Join(err, errors.New("could not find install plan"))
	}

	if ip == nil {
		return nil, errors.New("install plan is nil")
	}

	return ip, nil
}

// ApproveInstallPlan approves an install plan.
func (k *Kubernetes) ApproveInstallPlan(ctx context.Context, namespace, installPlanName string) (bool, error) {
	ip, err := k.client.GetInstallPlan(ctx, namespace, installPlanName)
	if err != nil {
		return false, err
	}

	k.l.Debugf("Approving install plan %s/%s", namespace, installPlanName)

	ip.Spec.Approved = true
	_, err = k.client.UpdateInstallPlan(ctx, namespace, ip)
	if err != nil {
		var sErr *apierrors.StatusError
		if ok := errors.As(err, &sErr); ok && sErr.Status().Reason == metav1.StatusReasonConflict {
			// The install plan has changed. We retry to get an updated install plan.
			k.l.Debugf("Retrying install plan update due to a version conflict. Error: %s", err)
			return false, nil
		}

		return false, err
	}

	return true, nil
}

// WaitForInstallPlanCompleted waits until install plan phase is "complete".
func (k *Kubernetes) WaitForInstallPlanCompleted(ctx context.Context, namespace, name string) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		ip, err := k.client.GetInstallPlan(ctx, namespace, name)
		if err != nil {
			k.l.Debugf("Could not retrieve install plan: %s", err)
			return false, nil
		}

		if ip.Status.Phase != olmv1alpha1.InstallPlanPhaseComplete {
			k.l.Debugf("Install plan is not completed. Phase: %s", ip.Status.Phase)
			return false, nil
		}

		return true, nil
	})
}
