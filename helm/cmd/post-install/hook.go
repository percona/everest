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

// Package postinstall provides a command for executing post-install Helm chart hooks.
package postinstall

import (
	"context"
	"fmt"
	"os"

	goversion "github.com/hashicorp/go-version"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	helmcommon "github.com/percona/everest/helm/cmd/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/helm"
)

// NewHookCmd creates a new command for executing post-install Helm chart hooks.
func NewHookCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "post-install",
		Short: "Runs the post-install hook",
		Run: func(cmd *cobra.Command, _ []string) {
			bindViperFlags(cmd)
			kubeConfig := viper.GetString("kubeconfig")
			kubeClient, err := helmcommon.NewClient(l, kubeConfig)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			v := viper.GetString("version")
			if v == "" {
				l.Error("version is required")
				os.Exit(1)
			}
			ver, err := goversion.NewVersion(v)
			if err != nil {
				l.Errorf("failed to parse version: %v", err)
				os.Exit(1)
			}
			helmClient := helm.New(l, kubeClient)
			if err := run(cmd.Context(), l, helmClient, ver); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}
	cmd.Flags().StringP("version", "v", "", "The version of Everest to install")
	return cmd
}

func run(
	ctx context.Context,
	l *zap.SugaredLogger,
	helmInstaller kubernetes.HelmInstaller,
	v *goversion.Version,
) error {
	if err := helmInstaller.ApproveEverestMonitoringInstallPlan(ctx); err != nil {
		return fmt.Errorf("failed to approve the install plan for Everest monitoring: %w", err)
	}
	l.Info("Installed Everest monitoring successfully")

	if err := helmInstaller.ApproveEverestOperatorInstallPlan(ctx, v); err != nil {
		return fmt.Errorf("failed to approve the install plan for Everest operator: %w", err)
	}
	l.Info("Installed Everest operator successfully")

	if err := helmInstaller.ApproveDBNamespacesInstallPlans(ctx); err != nil {
		return fmt.Errorf("failed to approve the install plan(s) for DB namespaces: %w", err)
	}
	l.Info("Installed Everest DB namespaces successfully")
	return nil
}

func bindViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("version", cmd.Flags().Lookup("version"))       //nolint:errcheck,gosec
}
