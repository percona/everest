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

// Package commands ...
package commands

import (
	"os"

	"github.com/spf13/cobra"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/install"
	"github.com/percona/everest/pkg/logger"
	"github.com/percona/everest/pkg/output"
)

var (
	installCmd = &cobra.Command{
		Use: "install [flags]",
		// The command expects no arguments. So to prevent users from misspelling and confusion
		// in cases with unexpected spaces like
		//       ./everestctl install --namespaces=aaa, a
		// it will return
		//        Error: unknown command "a" for "everestctl install"
		Args:    cobra.NoArgs,
		Example: "everestctl install --namespaces dev,staging,prod --operator.mongodb=true --operator.postgresql=false --operator.xtradb-cluster=false --skip-wizard",
		Long:    "Install Percona Everest using Helm",
		Short:   "Install Percona Everest using Helm",
		PreRunE: installPreRunE,
		Run:     installRun,
	}
	installCfg = &install.Config{}
)

func init() {
	rootCmd.AddCommand(installCmd)

	// local command flags
	installCmd.Flags().StringVar(&installCfg.Namespaces, cli.FlagNamespaces, install.DefaultDBNamespaceName, "Comma-separated namespaces list Percona Everest can manage")
	installCmd.Flags().BoolVar(&installCfg.SkipWizard, cli.FlagSkipWizard, false, "Skip installation wizard")
	installCmd.Flags().StringVar(&installCfg.VersionMetadataURL, cli.FlagVersionMetadataURL, "https://check.percona.com", "URL to retrieve version metadata information from")
	installCmd.Flags().StringVar(&installCfg.Version, cli.FlagVersion, "", "Everest version to install. By default the latest version is installed")
	installCmd.Flags().BoolVar(&installCfg.DisableTelemetry, cli.FlagDisableTelemetry, false, "Disable telemetry")
	_ = installCmd.Flags().MarkHidden(cli.FlagDisableTelemetry)
	installCmd.Flags().BoolVar(&installCfg.SkipEnvDetection, cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")
	installCmd.Flags().BoolVar(&installCfg.SkipDBNamespace, cli.FlagInstallSkipDBNamespace, false, "Skip creating a database namespace with install")

	// --namespaces and --skip-db-namespace flags are mutually exclusive
	installCmd.MarkFlagsMutuallyExclusive(cli.FlagNamespaces, cli.FlagInstallSkipDBNamespace)

	// --helm.* flags
	installCmd.Flags().StringVar(&installCfg.ChartDir, helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	_ = installCmd.Flags().MarkHidden(helm.FlagChartDir)
	installCmd.Flags().StringVar(&installCfg.RepoURL, helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	installCmd.Flags().StringSliceVar(&installCfg.Values.Values, helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	installCmd.Flags().StringSliceVarP(&installCfg.Values.ValueFiles, helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	// --operator.* flags
	installCmd.Flags().BoolVar(&installCfg.Operator.PSMDB, cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
	installCmd.Flags().BoolVar(&installCfg.Operator.PG, cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	installCmd.Flags().BoolVar(&installCfg.Operator.PXC, cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func installPreRunE(cmd *cobra.Command, _ []string) error { //nolint:revive
	if installCfg.SkipDBNamespace {
		installCfg.Namespaces = ""
	}

	// Copy global flags to config
	installCfg.Pretty = rootCmdFlags.Pretty
	installCfg.KubeconfigPath = rootCmdFlags.KubeconfigPath

	// If user doesn't pass --namespaces flag - need to ask explicitly.
	installCfg.AskNamespaces = !(cmd.Flags().Lookup(cli.FlagNamespaces).Changed || installCfg.SkipDBNamespace)

	// If user doesn't pass any --operator.* flags - need to ask explicitly.
	installCfg.AskOperators = !(cmd.Flags().Lookup(cli.FlagOperatorMongoDB).Changed ||
		cmd.Flags().Lookup(cli.FlagOperatorPostgresql).Changed ||
		cmd.Flags().Lookup(cli.FlagOperatorXtraDBCluster).Changed ||
		installCfg.SkipDBNamespace)

	return nil
}

func installRun(cmd *cobra.Command, _ []string) { //nolint:revive
	op, err := install.NewInstall(*installCfg, logger.GetLogger())
	if err != nil {
		logger.GetLogger().Error(err)
		os.Exit(1)
	}

	if err := op.Run(cmd.Context()); err != nil {
		output.PrintError(err, logger.GetLogger(), installCfg.Pretty)
		os.Exit(1)
	}
}
