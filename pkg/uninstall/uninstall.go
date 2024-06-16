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
	"strings"
	"time"

	"github.com/AlecAivazis/survey/v2"
	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/install"
	"github.com/percona/everest/pkg/kubernetes"
	cliVersion "github.com/percona/everest/pkg/version"
)

// Uninstall implements logic for the cluster command.
type Uninstall struct {
	config     Config
	kubeClient *kubernetes.Kubernetes
	l          *zap.SugaredLogger
}

// Config stores configuration for the Uninstall command.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string `mapstructure:"kubeconfig"`
	// AssumeYes is true when all questions can be skipped.
	AssumeYes bool `mapstructure:"assume-yes"`
	// Force is true when we shall not prompt for removal.
	Force bool
}

// NewUninstall returns a new Uninstall struct.
func NewUninstall(c Config, l *zap.SugaredLogger) (*Uninstall, error) {
	kubeClient, err := kubernetes.New(c.KubeconfigPath, l)
	if err != nil {
		return nil, err
	}

	cli := &Uninstall{
		config:     c,
		kubeClient: kubeClient,
		l:          l,
	}
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

		if err := u.deleteDBs(ctx); err != nil {
			return err
		}
	}

	// BackupStorages have finalizers, so we need to delete them first
	if err := u.deleteBackupStorages(ctx); err != nil {
		return err
	}

	if err := u.uninstallEverest(ctx); err != nil {
		return err
	}

	// VMAgent has finalizers, so we need to delete the monitoring configs first
	if err := u.deleteMonitoringConfigs(ctx); err != nil {
		return err
	}

	// There are no resources with finalizers in the monitoring namespace, so
	// we can delete it directly
	if err := u.deleteNamespaces(ctx, []string{install.MonitoringNamespace}); err != nil {
		return err
	}

	// All resources with finalizers in the system namespace (DBCs and
	// BackupStorages) have already been deleted, so we can delete the
	// namespace directly
	if err := u.deleteNamespaces(ctx, []string{common.SystemNamespace}); err != nil {
		return err
	}

	if err := u.deleteDBNamespaces(ctx); err != nil {
		return err
	}

	// There are no resources with finalizers in the monitoring namespace, so
	// we can delete it directly
	if err := u.deleteOLM(ctx); err != nil {
		return err
	}

	u.l.Info("Everest has been uninstalled successfully")
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
	namespaces, err := u.kubeClient.GetDBNamespaces(ctx, common.SystemNamespace)
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
			u.l.Infof("Deleting database cluster '%s' in namespace '%s'", db.Name, ns)
			// Delete in foreground.
			if !db.GetDeletionTimestamp().IsZero() {
				finalizers := db.GetFinalizers()
				finalizers = append(finalizers, common.ForegroundDeletionFinalizer)
				db.SetFinalizers(finalizers)
				// With the move to go 1.22 it's safe to reuse the same variable, see
				// https://go.dev/blog/loopvar-preview. However, gosec linter doesn't
				// like it. Let's disable it for this line until they are updated to
				// support go 1.22.
				if err := u.kubeClient.PatchDatabaseCluster(&db); err != nil { //nolint:gosec
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
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, false, func(ctx context.Context) (bool, error) {
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
		u.l.Infof("Deleting namespace '%s'", ns)
		if err := u.kubeClient.DeleteNamespace(ctx, ns); client.IgnoreNotFound(err) != nil {
			return err
		}
	}

	// Wait for all namespaces to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for namespace(s) '%s' to be deleted", strings.Join(namespaces, "', '"))
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, false, func(ctx context.Context) (bool, error) {
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

		return true, nil
	})
}

func (u *Uninstall) deleteDBNamespaces(ctx context.Context) error {
	// List all namespaces managed by everest.
	namespaceList, err := u.kubeClient.ListNamespaces(ctx, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				common.KubernetesManagedByLabel: common.Everest,
			},
		}),
	})
	if err != nil {
		return err
	}
	namespaces := make([]string, 0, len(namespaceList.Items))
	for _, item := range namespaceList.Items {
		namespaces = append(namespaces, item.Name)
	}
	if len(namespaces) > 0 {
		return u.deleteNamespaces(ctx, namespaces)
	}
	return nil
}

func (u *Uninstall) deleteBackupStorages(ctx context.Context) error { //nolint:dupl
	storages, err := u.kubeClient.ListBackupStorages(ctx, common.SystemNamespace)
	if client.IgnoreNotFound(err) != nil {
		return err
	}

	if len(storages.Items) == 0 {
		return nil
	}

	for _, storage := range storages.Items {
		u.l.Infof("Deleting backup storage '%s'", storage.Name)
		if err := u.kubeClient.DeleteBackupStorage(ctx, common.SystemNamespace, storage.Name); err != nil {
			return err
		}
	}

	// Wait for all backup storages to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for backup storages to be deleted")
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, false, func(ctx context.Context) (bool, error) {
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

func (u *Uninstall) deleteMonitoringConfigs(ctx context.Context) error { //nolint:dupl
	monitoringConfigs, err := u.kubeClient.ListMonitoringConfigs(ctx, install.MonitoringNamespace)
	if client.IgnoreNotFound(err) != nil {
		return err
	}

	if len(monitoringConfigs.Items) == 0 {
		return nil
	}

	for _, config := range monitoringConfigs.Items {
		u.l.Infof("Deleting monitoring config '%s'", config.Name)
		if err := u.kubeClient.DeleteMonitoringConfig(ctx, install.MonitoringNamespace, config.Name); err != nil {
			return err
		}
	}

	// Wait for all monitoring configs to be deleted, or timeout after 5 minutes.
	u.l.Infof("Waiting for monitoring configs to be deleted")
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, false, func(ctx context.Context) (bool, error) {
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
	err := wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, false, func(ctx context.Context) (bool, error) {
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
	everestVersion, err := cliVersion.EverestVersionFromDeployment(ctx, u.kubeClient)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil
		}
		return errors.Join(err, errors.New("could not retrieve Everest version"))
	}

	if err := u.kubeClient.DeleteEverest(ctx, common.SystemNamespace, everestVersion); client.IgnoreNotFound(err) != nil {
		return err
	}
	return nil
}
