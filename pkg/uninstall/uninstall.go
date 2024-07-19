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
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/install"
	"github.com/percona/everest/pkg/kubernetes"
	cliVersion "github.com/percona/everest/pkg/version"
)

const (
	pollInterval = 5 * time.Second
	pollTimeout  = 5 * time.Minute
)

// Uninstall implements logic for the cluster command.
type Uninstall struct {
	config     Config
	kubeClient *kubernetes.Kubernetes
	l          *zap.SugaredLogger

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
func (u *Uninstall) Run(ctx context.Context) error { //nolint:funlen
	if abort, err := u.runWizard(); err != nil {
		return err
	} else if abort {
		u.l.Info("Exiting")
		return nil
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

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete Everest API server",
		F: func(ctx context.Context) error {
			return u.uninstallEverest(ctx)
		},
	})

	// VMAgent has finalizers, so we need to delete the monitoring configs first
	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete monitoring configs",
		F: func(ctx context.Context) error {
			return u.deleteMonitoringConfigs(ctx)
		},
	})

	// There are no resources with finalizers in the monitoring namespace, so
	// we can delete it directly
	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: fmt.Sprintf("Delete namespace '%s'", install.MonitoringNamespace),
		F: func(ctx context.Context) error {
			return u.deleteNamespaces(ctx, []string{install.MonitoringNamespace})
		},
	})

	// All resources with finalizers in the system namespace (DBCs and
	// BackupStorages) have already been deleted, so we can delete the
	// namespace directly
	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: fmt.Sprintf("Delete namespace '%s'", common.SystemNamespace),
		F: func(ctx context.Context) error {
			return u.deleteNamespaces(ctx, []string{common.SystemNamespace})
		},
	})

	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete database namespaces",
		F: func(ctx context.Context) error {
			return u.deleteDBNamespaces(ctx)
		},
	})

	// There are no resources with finalizers in the monitoring namespace, so
	// we can delete it directly
	uninstallSteps = append(uninstallSteps, common.Step{
		Desc: "Delete Operator Lifecycle Manager",
		F: func(ctx context.Context) error {
			return u.deleteOLM(ctx)
		},
	})

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
	u.l.Infof("Everest has been uninstalled successfully", u.numResourcesDeleted)
	fmt.Fprintln(out, "Everest has been uninstalled successfully")
	return nil
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
			// Delete in foreground.
			if !db.GetDeletionTimestamp().IsZero() {
				finalizers := db.GetFinalizers()
				finalizers = append(finalizers, common.ForegroundDeletionFinalizer)
				db.SetFinalizers(finalizers)
				if err := u.kubeClient.PatchDatabaseCluster(&db); err != nil {
					return errors.Join(errors.New("failed to add foregroundDeletion finalizer"), err)
				}
			}
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

func (u *Uninstall) deleteDBNamespaces(ctx context.Context) error {
	u.l.Info("Trying to delete database namespaces")
	namespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return errors.Join(err, errors.New("failed to deleteDBNamespaces"))
	}
	if len(namespaces) == 0 {
		u.l.Info("No database namespaces found")
		return nil
	}
	return u.deleteNamespaces(ctx, namespaces)
}

func (u *Uninstall) deleteBackupStorages(ctx context.Context) error {
	u.l.Info("Trying to delete backup storages")
	storages, err := u.kubeClient.ListBackupStorages(ctx, common.SystemNamespace)
	if client.IgnoreNotFound(err) != nil {
		return err
	}

	if len(storages.Items) == 0 {
		u.l.Info("All backup storages have been deleted")
		return nil
	}

	for _, storage := range storages.Items {
		u.l.Infof("Deleting backup storage '%s'", storage.Name)
		u.numResourcesDeleted++
		if err := u.kubeClient.DeleteBackupStorage(ctx, common.SystemNamespace, storage.Name); err != nil {
			return err
		}
	}

	// Wait for all backup storages to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for backup storages to be deleted")
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		storages, err := u.kubeClient.ListBackupStorages(ctx, common.SystemNamespace)
		if err != nil {
			return false, err
		}

		if len(storages.Items) > 0 {
			return false, nil
		}

		u.l.Info("All backup storages have been deleted")

		return true, nil
	})
}

func (u *Uninstall) deleteMonitoringConfigs(ctx context.Context) error {
	u.l.Info("Trying to delete monitoring configs")
	monitoringConfigs, err := u.kubeClient.ListMonitoringConfigs(ctx, install.MonitoringNamespace)
	if client.IgnoreNotFound(err) != nil {
		u.l.Info("No monitoring configs found")
		return err
	}

	if len(monitoringConfigs.Items) == 0 {
		u.l.Info("No monitoring configs found")
		return nil
	}

	for _, config := range monitoringConfigs.Items {
		u.numResourcesDeleted++
		u.l.Infof("Deleting monitoring config '%s'", config.Name)
		if err := u.kubeClient.DeleteMonitoringConfig(ctx, install.MonitoringNamespace, config.Name); err != nil {
			return err
		}
	}

	// Wait for all monitoring configs to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for monitoring configs to be deleted")
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		monitoringConfigs, err := u.kubeClient.ListMonitoringConfigs(ctx, install.MonitoringNamespace)
		if err != nil {
			return false, err
		}

		if len(monitoringConfigs.Items) > 0 {
			return false, nil
		}

		u.l.Info("All monitoring configs have been deleted")

		return true, nil
	})
}

func (u *Uninstall) deleteOLM(ctx context.Context) error {
	packageServerName := types.NamespacedName{Name: "packageserver", Namespace: kubernetes.OLMNamespace}
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

	return u.deleteNamespaces(ctx, []string{kubernetes.OLMNamespace})
}

func (u *Uninstall) uninstallEverest(ctx context.Context) error {
	u.l.Info("Trying to uninstall Everest Deployment")
	everestVersion, err := cliVersion.EverestVersionFromDeployment(ctx, u.kubeClient)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			u.l.Info("Everest Deployment was not found")
			return nil
		}
		return errors.Join(err, errors.New("could not retrieve Everest version"))
	}

	if err := u.kubeClient.DeleteEverest(ctx, common.SystemNamespace, everestVersion); client.IgnoreNotFound(err) != nil {
		return err
	}
	u.l.Info("Everest Deployment has been deleted")
	u.numResourcesDeleted++
	return nil
}
