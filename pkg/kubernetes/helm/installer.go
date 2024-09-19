package helm

import (
	"context"

	"github.com/percona/everest/pkg/kubernetes"
)

type Installer struct {
	kubeclient kubernetes.KubernetesConnector
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the monitoring operators.
func (i *Installer) ApproveEverestMonitoringInstallPlan(ctx context.Context) error {
	return nil
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the everest operator.
func (i *Installer) ApproveEverestOperatorInstallPlan(context.Context) error {
	return nil
}

// ApproveEverestMonitoringInstallPlan approves the install plans needed for installing the DB namespaces.
func (i *Installer) ApproveDBNamespacesInstallPlans(context.Context) error {
	return nil
}
