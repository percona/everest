package uninstall

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func (u *Uninstall) newStepDeleteDatabaseClusters() steps.Step {
	return steps.Step{
		Desc: "Deleting database clusters",
		F: func(ctx context.Context) error {
			return u.deleteDBs(ctx)
		},
	}
}

func (u *Uninstall) newStepDeleteBackupStorages() steps.Step {
	return steps.Step{
		Desc: "Deleting backup storages",
		F: func(ctx context.Context) error {
			return u.deleteBackupStorages(ctx)
		},
	}
}

func (u *Uninstall) newStepDeleteMonitoringConfigs() steps.Step {
	return steps.Step{
		Desc: "Deleting monitoring configs",
		F: func(ctx context.Context) error {
			return u.deleteMonitoringConfigs(ctx)
		},
	}
}

func (u *Uninstall) newStepUninstallHelmChart() steps.Step {
	return steps.Step{
		Desc: "Uninstalling Helm chart",
		F: func(ctx context.Context) error {
			return u.uninstallHelmChart(ctx)
		},
	}
}

func (u *Uninstall) newStepDeleteDBNamespaces(helmUninstall bool) steps.Step {
	return steps.Step{
		Desc: "Deleting database namespaces",
		F: func(ctx context.Context) error {
			return u.deleteDBNamespaces(ctx, helmUninstall)
		},
	}
}

func (u *Uninstall) newStepDeleteNamespace(ns string) steps.Step {
	return steps.Step{
		Desc: fmt.Sprintf("Deleting namespace %s", ns),
		F: func(ctx context.Context) error {
			return u.deleteNamespaces(ctx, []string{ns})
		},
	}
}

func (u *Uninstall) newStepDeleteOLM() steps.Step {
	return steps.Step{
		Desc: "Deleting OLM",
		F: func(ctx context.Context) error {
			return u.deleteOLM(ctx, kubernetes.OLMNamespace)
		},
	}
}

func (u *Uninstall) newStepCleanupLeftovers() steps.Step {
	return steps.Step{
		Desc: "Cleaning up leftovers",
		F: func(ctx context.Context) error {
			return u.cleanupLeftovers(ctx)
		},
	}
}

// todo
func (u *Uninstall) cleanupLeftovers(ctx context.Context) error {
	// return u.kubeClient.DeleteManifestFile(file, common.SystemNamespace)
	return nil
}

func (u *Uninstall) uninstallHelmChart(ctx context.Context) error {
	// First delete the CSVs in monitoring namespace, otherwise the deletion of the namespace will be stuck.
	// TODO: remove this after we install Victoriametrics using its Helm chart.
	if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		csvs, err := u.kubeClient.ListClusterServiceVersion(ctx, common.MonitoringNamespace)
		if err != nil {
			return false, err
		}
		if len(csvs.Items) == 0 {
			return true, nil
		}
		for _, csv := range csvs.Items {
			if err := u.kubeClient.DeleteClusterServiceVersion(ctx, types.NamespacedName{
				Name:      csv.Name,
				Namespace: csv.Namespace,
			}); err != nil {
				return false, err
			}
		}
		return false, nil
	}); err != nil {
		return err
	}
	// Delete helm chart.
	uninstaller, err := helm.NewUninstaller(common.SystemNamespace, common.SystemNamespace, u.config.KubeconfigPath)
	if err != nil {
		return fmt.Errorf("failed to create Helm uninstaller: %w", err)
	}
	_, err = uninstaller.Uninstall(false)
	if err != nil {
		return fmt.Errorf("failed to uninstall Helm chart: %w", err)
	}
	return nil
}
