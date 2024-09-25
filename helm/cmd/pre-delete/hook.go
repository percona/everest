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

// Package predelete provides a command for executing pre-delete Helm chart hooks.
package predelete

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	helmcommon "github.com/percona/everest/helm/cmd/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/helm"
)

// NewHookCmd creates a new command for executing pre-delete Helm chart hooks.
func NewHookCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "pre-delete",
		Short: "Runs the pre-delete helm chart hooks",
		Run: func(cmd *cobra.Command, _ []string) {
			bindViperFlags(cmd)
			kubeConfig := viper.GetString("kubeconfig")
			kubeClient, err := helmcommon.NewClient(l, kubeConfig)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			helmClient := helm.New(l, kubeClient)
			if err := run(cmd.Context(), l, helmClient); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}

	return cmd
}

func run(ctx context.Context, l *zap.SugaredLogger, helmInstaller kubernetes.HelmInstaller) error {
	l.Info("Deleting all existing DBs in the cluster")
	if err := helmInstaller.DeleteAllDatabaseClusters(ctx); err != nil {
		return fmt.Errorf("failed to delete all existing DBs: %w", err)
	}

	l.Info("Deleting all BackupStorages")
	if err := helmInstaller.DeleteAllBackupStorages(ctx); err != nil {
		return fmt.Errorf("failed to delete all BackupStorages: %w", err)
	}

	l.Info("Deleting all MonitoringInstances")
	if err := helmInstaller.DeleteAllMonitoringInstances(ctx); err != nil {
		return fmt.Errorf("failed to delete all MonitoringInstances: %w", err)
	}

	// Before the OLM namespace is terminated by helm uninstall, we must first
	// delete the PackageServer CSV so that OLM is uninstalled gracefully, and does not get stuck.
	if err := helmInstaller.DeleteOLM(ctx); err != nil {
		return fmt.Errorf("failed to delete OLM: %w", err)
	}
	return nil
}

func bindViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}
