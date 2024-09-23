package helm

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/util/wait"
)

var b = backoff.WithMaxRetries(backoff.NewConstantBackOff(time.Second*5), 10)

// Installer provides methods for installing the Everest helm chart.
type Installer struct {
	kubeclient kubernetes.KubernetesConnector
	l          *zap.SugaredLogger
}

// New returns a new Helm chart.
func New(l *zap.SugaredLogger, kubeclient kubernetes.KubernetesConnector) *Installer {
	return &Installer{
		kubeclient: kubeclient,
		l:          l,
	}
}

func (i *Installer) approveInstallPlanForSubscription(ctx context.Context, subNamespace, subName string) error {
	// Wait for the install plan to be created.
	ip, err := i.kubeclient.WaitForInstallPlan(ctx, subNamespace, subName, nil)
	if err != nil {
		return errors.Join(err, errors.New("failed waiting for install plan to be created"))
	}
	// Approve the install plan.
	if err := wait.PollUntilContextCancel(ctx, time.Second*5, true, func(ctx context.Context) (done bool, err error) {
		return i.kubeclient.ApproveInstallPlan(ctx, ip.GetNamespace(), ip.GetName())
	}); err != nil {
		return fmt.Errorf("failed to approve installplan %s/%s: %w", ip.GetNamespace(), ip.GetName(), err)
	}
	// Wait for install plan to succeed.
	if err := i.kubeclient.WaitForInstallPlanCompleted(ctx, ip.GetNamespace(), ip.GetName()); err != nil {
		return fmt.Errorf("failed to wait for installplan %s/%s to complete: %w", ip.GetNamespace(), ip.GetName(), err)
	}
	// Ensure CSV has succeeded.
	csvKey, err := i.kubeclient.GetSubscriptionCSV(ctx, subNamespace, subName)
	if err != nil {
		return fmt.Errorf("failed to get CSV for %s: %w", subName, err)
	}
	if err := i.kubeclient.WaitForCSVSucceeded(ctx, csvKey.Namespace, csvKey.Name); err != nil {
		return fmt.Errorf("failed to wait for CSV %s/%s to succeed: %w", csvKey.Namespace, csvKey.Name, err)
	}
	return nil
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the monitoring operators.
func (i *Installer) ApproveEverestMonitoringInstallPlan(ctx context.Context) error {
	return i.approveInstallPlanForSubscription(ctx, common.MonitoringNamespace, common.VictoriaMetricsOperatorName)
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the everest operator.
func (i *Installer) ApproveEverestOperatorInstallPlan(ctx context.Context) error {
	return i.approveInstallPlanForSubscription(ctx, common.SystemNamespace, common.EverestOperatorName)
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the DB namespaces.
func (i *Installer) ApproveDBNamespacesInstallPlans(ctx context.Context) error {
	dbNamespaces, err := i.kubeclient.GetDBNamespaces(ctx)
	if err != nil {
		return errors.Join(err, errors.New("failed to get DB namespaces"))
	}
	for _, namespace := range dbNamespaces {
		i.l.Infof("Installing operators in namespace '%s'", namespace)
		subs, err := i.kubeclient.ListSubscriptions(ctx, namespace)
		if err != nil {
			return fmt.Errorf("failed to get subscriptions for namespace %s: %w", namespace, err)
		}
		g, _ := errgroup.WithContext(ctx)
		for _, sub := range subs.Items {
			g.Go(func() error {
				return i.approveInstallPlanForSubscription(ctx, namespace, sub.GetName())
			})
			if err := g.Wait(); err != nil {
				return fmt.Errorf("failed to install operators in namespace '%s': %w", namespace, err)
			}
		}

	}
	return nil
}
