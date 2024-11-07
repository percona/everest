// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package uninstall ...
package uninstall

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/AlecAivazis/survey/v2"
	"go.uber.org/zap"
	"helm.sh/helm/v3/pkg/storage/driver"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/helm"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	pollInterval = 5 * time.Second
	pollTimeout  = 5 * time.Minute

	// catalogSource is the name of the catalog source.
	catalogSource = "everest-catalog"

	// FlagCatalogNamespace is the name of the catalog namespace flag.
	FlagCatalogNamespace = "catalog-namespace"
	// FlagSkipEnvDetection is the name of the skip env detection flag.
	FlagSkipEnvDetection = "skip-env-detection"
	// FlagSkipOLM is the name of the skip OLM flag.
	FlagSkipOLM = "skip-olm"
)

// Uninstall implements logic for the cluster command.
type Uninstall struct {
	config      Config
	kubeClient  *kubernetes.Kubernetes
	l           *zap.SugaredLogger
	clusterType kubernetes.ClusterType
	// keep a count of the number of resources deleted.
	numResourcesDeleted int32
}

// Config stores configuration for the Uninstall command.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string `mapstructure:"kubeconfig"`
	// AssumeYes is true when all questions can be skipped.
	AssumeYes bool `mapstructure:"assume-yes"`
	// Force is true when we shall not prompt for removal.
	Force bool
	// SkipEnvDetection skips detecting the Kubernetes environment.
	SkipEnvDetection bool `mapstructure:"skip-env-detection"`

	// If set, we will print the pretty output.
	Pretty bool
}

// NewUninstall returns a new Uninstall struct.
func NewUninstall(c Config, l *zap.SugaredLogger) (*Uninstall, error) {
	cli := &Uninstall{
		config: c,
		l:      l,
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}
	kubeClient, err := kubernetes.New(c.KubeconfigPath, cli.l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	cli.kubeClient = kubeClient
	return cli, nil
}

// Run runs the cluster command.
func (u *Uninstall) Run(ctx context.Context) error { //nolint:funlen,cyclop
	if abort, err := u.runWizard(); err != nil {
		return err
	} else if abort {
		u.l.Info("Exiting")
		return nil
	}

	if !u.config.SkipEnvDetection {
		t, err := u.kubeClient.GetClusterType(ctx)
		if err != nil {
			return fmt.Errorf("failed to detect cluster type: %w", err)
		}
		u.clusterType = t
	}

	uninstallSteps := []common.Step{}
	dbsExist, err := u.dbsExist(ctx)
	if err != nil {
		return err
	}
	if dbsExist {
		force, err := u.confirmForce()
		if err != nil {
			return err
		}

		if !force {
			u.l.Info("Can't proceed without deleting database clusters")
			return nil
		}

		uninstallSteps = append(uninstallSteps, common.Step{
			Desc: "Delete database clusters",
			F: func(ctx context.Context) error {
				return u.deleteDBs(ctx)
			},
		})
	}

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete backup storages",
		F: func(ctx context.Context) error {
			return u.deleteBackupStorages(ctx)
		},
	})

	// VMAgent has finalizers, so we need to delete the monitoring configs first
	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete monitoring configs",
		F: func(ctx context.Context) error {
			return u.deleteMonitoringConfigs(ctx)
		},
	})

	chartExists, err := u.helmReleaseExists()
	if err != nil {
		return fmt.Errorf("failed to check if Helm release exists: %w", err)
	}

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete database namespaces",
		F: func(ctx context.Context) error {
			return u.deleteDBNamespaces(ctx, chartExists)
		},
	})

	if chartExists {
		u.l.Info("Found Helm release, deleting chart")
		uninstallSteps = append(uninstallSteps, u.deleteEverestHelmChart()...)
	}

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: fmt.Sprintf("Delete namespace '%s'", common.MonitoringNamespace),
		F: func(ctx context.Context) error {
			return u.deleteNamespaces(ctx, []string{common.MonitoringNamespace})
		},
	})

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: fmt.Sprintf("Delete namespace '%s'", common.SystemNamespace),
		F: func(ctx context.Context) error {
			return u.deleteNamespaces(ctx, []string{common.SystemNamespace})
		},
	})

	// If the chart does not exist, it is possible that Everest was installed without Helm.
	// We need to check if OLM is installed and delete it.
	if !chartExists {
		_, err := u.kubeClient.GetNamespace(ctx, kubernetes.OLMNamespace)
		if err != nil && !k8serrors.IsNotFound(err) {
			return err
		} else if err == nil {
			uninstallSteps = append(uninstallSteps, common.Step{
				Desc: "Delete OLM",
				F: func(ctx context.Context) error {
					return u.deleteOLM(ctx, kubernetes.OLMNamespace)
				},
			})
		}
	}

	var out io.Writer = os.Stdout
	if !u.config.Pretty {
		out = io.Discard
	}

	if err := common.RunStepsWithSpinner(ctx, uninstallSteps, out); err != nil {
		return err
	}

	if u.numResourcesDeleted == 0 {
		u.l.Infof("Everest was not installed")
		fmt.Fprintln(out, "Everest was not installed")
		return nil
	}
	u.l.Infof("Everest has been uninstalled successfully")
	fmt.Fprintln(out, "Everest has been uninstalled successfully")
	return nil
}

// legacy deletion method.
func (u *Uninstall) deleteManifests() []common.Step {
	return nil
}

func (u *Uninstall) deleteEverestHelmChart() []common.Step {
	steps := []common.Step{}
	// Delete core components.
	steps = append(steps, common.Step{
		Desc: fmt.Sprintf("Delete Helm chart release '%s' in namespace '%s'",
			common.SystemNamespace, common.SystemNamespace),
		F: func(ctx context.Context) error {
			// First delete the CSVs in monitoring namespace, otherwise the deletion of the namespace will be stuck.
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
			uninstaller, err := helm.NewUninstaller(common.SystemNamespace, u.config.KubeconfigPath)
			if err != nil {
				return fmt.Errorf("failed to create Helm uninstaller: %w", err)
			}
			return uninstaller.Uninstall(common.SystemNamespace)
		},
	})
	return steps
}

// Run the uninstall wizard.
// Returns true if uninstall is aborted.
func (u *Uninstall) runWizard() (bool, error) {
	if !u.config.AssumeYes {
		msg := `You are about to uninstall Everest from the Kubernetes cluster.
This will uninstall Everest and all its components from the cluster.`
		fmt.Printf("\n%s\n\n", msg) //nolint:forbidigo
		confirm := &survey.Confirm{
			Message: "Are you sure you want to uninstall Everest?",
		}
		prompt := false
		if err := survey.AskOne(confirm, &prompt); err != nil {
			return false, err
		}

		if !prompt {
			return true, nil
		}
	}

	return false, nil
}

func (u *Uninstall) confirmForce() (bool, error) {
	if u.config.Force {
		return true, nil
	}

	confirm := &survey.Confirm{
		Message: "There are still database clusters managed by Everest. Do you want to delete them?",
	}
	prompt := false
	if err := survey.AskOne(confirm, &prompt); err != nil {
		return false, err
	}

	return prompt, nil
}

func (u *Uninstall) getDBs(ctx context.Context) (map[string]*everestv1alpha1.DatabaseClusterList, error) {
	allDBs := make(map[string]*everestv1alpha1.DatabaseClusterList)
	namespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		// If the system namespace doesn't exist, we assume there are no DBs.
		if k8serrors.IsNotFound(err) {
			return allDBs, nil
		}
		return nil, err
	}

	for _, ns := range namespaces {
		dbs, err := u.kubeClient.ListDatabaseClusters(ctx, ns)
		if err != nil {
			return nil, err
		}

		allDBs[ns] = dbs
	}

	return allDBs, nil
}

func (u *Uninstall) dbsExist(ctx context.Context) (bool, error) {
	allDBs, err := u.getDBs(ctx)
	if err != nil {
		return false, err
	}

	exist := false
	for ns, dbs := range allDBs {
		if len(dbs.Items) == 0 {
			continue
		}

		exist = true
		u.l.Warnf("Database clusters in namespace '%s':", ns)
		for _, db := range dbs.Items {
			u.l.Warnf("  - %s", db.Name)
		}
	}

	return exist, nil
}

func (u *Uninstall) deleteDBs(ctx context.Context) error {
	allDBs, err := u.getDBs(ctx)
	if err != nil {
		return err
	}

	for ns, dbs := range allDBs {
		for _, db := range dbs.Items {
			u.numResourcesDeleted++
			u.l.Infof("Deleting database cluster '%s' in namespace '%s'", db.Name, ns)
			if err := u.kubeClient.DeleteDatabaseCluster(ctx, ns, db.Name); err != nil {
				return err
			}
		}
	}

	// Wait for all database clusters to be deleted, or timeout after 5 minutes.
	u.l.Info("Waiting for database clusters to be deleted")
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		allDBs, err := u.getDBs(ctx)
		if err != nil {
			return false, err
		}

		for _, dbs := range allDBs {
			if len(dbs.Items) > 0 {
				return false, nil
			}
		}

		u.l.Info("All database clusters have been deleted")

		return true, nil
	})
}

func (u *Uninstall) deleteNamespaces(ctx context.Context, namespaces []string) error {
	for _, ns := range namespaces {
		u.l.Infof("Trying to delete namespace '%s'", ns)
		if err := u.kubeClient.DeleteNamespace(ctx, ns); err != nil {
			if k8serrors.IsNotFound(err) {
				u.l.Infof("Namespace '%s' was not found", ns)
				return nil
			}
			return err
		}
	}

	// Wait for all namespaces to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for namespace(s) '%s' to be deleted", strings.Join(namespaces, "', '"))
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		for _, ns := range namespaces {
			_, err := u.kubeClient.GetNamespace(ctx, ns)
			if err != nil && !k8serrors.IsNotFound(err) {
				return false, err
			}
			if err == nil {
				return false, nil
			}
		}

		u.l.Infof("Namespace(s) '%s' have been deleted", strings.Join(namespaces, "', '"))
		u.numResourcesDeleted++
		return true, nil
	})
}

func (u *Uninstall) deleteDBNamespaces(ctx context.Context, deleteChart bool) error {
	u.l.Info("Trying to delete database namespaces")
	namespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return errors.Join(err, errors.New("failed to deleteDBNamespaces"))
	}
	if len(namespaces) == 0 {
		u.l.Info("No database namespaces found")
		return nil
	}
	if deleteChart {
		for _, ns := range namespaces {
			if err := u.deleteDBNamespaceHelmChart(ctx, ns); err != nil {
				return errors.Join(err, errors.New("failed to deleteDBNamespaceHelmChart"))
			}
		}
	}
	return u.deleteNamespaces(ctx, namespaces)
}

func (u *Uninstall) deleteDBNamespaceHelmChart(ctx context.Context, namespace string) error {
	uninstaller, err := helm.NewUninstaller(namespace, u.config.KubeconfigPath)
	if err != nil {
		return err
	}
	return uninstaller.Uninstall(namespace)
}

func (u *Uninstall) deleteBackupStorages(ctx context.Context) error {
	u.l.Info("Trying to delete backup storages")
	storages, err := u.kubeClient.ListBackupStorages(ctx, common.SystemNamespace)
	if client.IgnoreNotFound(err) != nil {
		return err
	}

	// List backup storages in DB namespaces.
	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return err
	}
	for _, ns := range dbNamespaces {
		list, err := u.kubeClient.ListBackupStorages(ctx, ns)
		if err != nil {
			return fmt.Errorf("failed to list backup storages in namespace %s: %w", ns, err)
		}
		storages.Items = append(storages.Items, list.Items...)
	}

	if len(storages.Items) == 0 {
		u.l.Info("All backup storages have been deleted")
		return nil
	}

	for _, storage := range storages.Items {
		u.l.Infof("Deleting backup storage '%s'", storage.Name)
		u.numResourcesDeleted++
		if err := u.kubeClient.DeleteBackupStorage(ctx, storage.GetNamespace(), storage.GetName()); err != nil {
			return err
		}
	}

	// Wait for all backup storages to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for backup storages to be deleted")
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		for _, bs := range storages.Items {
			_, err := u.kubeClient.GetBackupStorage(ctx, bs.GetNamespace(), bs.GetName())
			if k8serrors.IsNotFound(err) {
				continue
			} else if err != nil {
				return false, err
			}
			return false, nil
		}
		u.l.Info("All backup storages have been deleted")
		return true, nil
	})
}

func (u *Uninstall) deleteMonitoringConfigs(ctx context.Context) error {
	u.l.Info("Trying to delete monitoring configs")
	monitoringConfigs, err := u.kubeClient.ListMonitoringConfigs(ctx, common.MonitoringNamespace)
	if client.IgnoreNotFound(err) != nil {
		u.l.Info("No monitoring configs found")
		return err
	}

	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return fmt.Errorf("failed to get DB namespaces: %w", err)
	}
	for _, ns := range dbNamespaces {
		list, err := u.kubeClient.ListMonitoringConfigs(ctx, ns)
		if err != nil {
			return fmt.Errorf("failed to list monitoring configs in namespace %s: %w", ns, err)
		}
		monitoringConfigs.Items = append(monitoringConfigs.Items, list.Items...)
	}

	if len(monitoringConfigs.Items) == 0 {
		u.l.Info("No monitoring configs found")
		return nil
	}

	for _, config := range monitoringConfigs.Items {
		u.numResourcesDeleted++
		u.l.Infof("Deleting monitoring config '%s'", config.Name)
		if err := u.kubeClient.DeleteMonitoringConfig(ctx, config.GetNamespace(), config.GetName()); err != nil {
			return err
		}
	}

	// Wait for all monitoring configs to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for monitoring configs to be deleted")
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		for _, mc := range monitoringConfigs.Items {
			_, err := u.kubeClient.GetMonitoringConfig(ctx, mc.GetNamespace(), mc.GetName())
			if k8serrors.IsNotFound(err) {
				continue
			} else if err != nil {
				return false, err
			}
			return false, nil
		}
		u.l.Info("All monitoring configs have been deleted")
		return true, nil
	})
}

func (u *Uninstall) deleteOLM(ctx context.Context, namespace string) error {
	packageServerName := types.NamespacedName{Name: "packageserver", Namespace: namespace}
	if err := u.kubeClient.DeleteClusterServiceVersion(ctx, packageServerName); client.IgnoreNotFound(err) != nil {
		return err
	}

	// Wait for the packageserver CSV to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for packageserver CSV to be deleted")
	err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		_, err := u.kubeClient.GetClusterServiceVersion(ctx, packageServerName)
		if err != nil && !k8serrors.IsNotFound(err) {
			return false, err
		}

		if err == nil {
			return false, nil
		}

		u.l.Info("Packageserver CSV has been deleted")

		return true, nil
	})
	if err != nil {
		return err
	}

	return u.deleteNamespaces(ctx, []string{namespace})
}

func (u *Uninstall) helmReleaseExists() (bool, error) {
	g, err := helm.NewGetter(common.SystemNamespace, u.config.KubeconfigPath)
	if err != nil {
		return false, err
	}
	if _, err := g.Get(common.SystemNamespace); errors.Is(err, driver.ErrReleaseNotFound) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return true, nil
}
