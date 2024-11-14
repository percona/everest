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
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli/install"
	"github.com/percona/everest/pkg/helm"
	"github.com/percona/everest/pkg/output"
)

func newInstallCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use: "install",
		// The command expects no arguments. So to prevent users from misspelling and confusion
		// in cases with unexpected spaces like
		//       ./everestctl install --namespaces=aaa, a
		// it will return
		//        Error: unknown command "a" for "everestctl install"
		Args:    cobra.NoArgs,
		Example: "everestctl install --namespaces dev,staging,prod --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard",
		Long:    "Install Percona Everest Helm chart",
		Short:   "Install Percona Everest",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initInstallViperFlags(cmd)
			c := &install.Config{}
			err := viper.Unmarshal(c)
			if err != nil {
				os.Exit(1)
			}
			bindInstallHelmOpts(c)

			enableLogging := viper.GetBool("verbose") || viper.GetBool("json")
			c.Pretty = !enableLogging

			op, err := install.NewInstall(*c, l, cmd)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if err := op.Run(cmd.Context()); err != nil {
				output.PrintError(err, l, !enableLogging)
				os.Exit(1)
			}
		},
	}
	initInstallFlags(cmd)

	return cmd
}

func initInstallFlags(cmd *cobra.Command) {
	cmd.Flags().String(install.FlagNamespaces, install.DefaultEverestNamespace, "Comma-separated namespaces list Percona Everest can manage")
	cmd.Flags().Bool(install.FlagSkipWizard, false, "Skip installation wizard")
	cmd.Flags().String(install.FlagVersionMetadataURL, "https://check.percona.com", "URL to retrieve version metadata information from")
	cmd.Flags().String(install.FlagVersion, "", "Everest version to install. By default the latest version is installed")
	cmd.Flags().Bool(install.FlagDisableTelemetry, false, "Disable telemetry")
	cmd.Flags().MarkHidden(install.FlagDisableTelemetry) //nolint:errcheck,gosec
	cmd.Flags().Bool(install.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")

	cmd.Flags().String(install.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	cmd.Flags().MarkHidden(install.FlagChartDir) //nolint:errcheck,gosec
	cmd.Flags().String(install.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	cmd.Flags().StringSlice(install.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	cmd.Flags().StringSliceP(install.FlagHelmValuesFiles, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	cmd.Flags().Bool(install.FlagOperatorMongoDB, true, "Install MongoDB operator")
	cmd.Flags().Bool(install.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	cmd.Flags().Bool(install.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func initInstallViperFlags(cmd *cobra.Command) {
	viper.BindPFlag(install.FlagSkipWizard, cmd.Flags().Lookup(install.FlagSkipWizard)) //nolint:errcheck,gosec

	viper.BindEnv("kubeconfig")                                                                         //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))                                     //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagNamespaces, cmd.Flags().Lookup(install.FlagNamespaces))                 //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagVersionMetadataURL, cmd.Flags().Lookup(install.FlagVersionMetadataURL)) //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagVersion, cmd.Flags().Lookup(install.FlagVersion))                       //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagDisableTelemetry, cmd.Flags().Lookup(install.FlagDisableTelemetry))     //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagSkipEnvDetection, cmd.Flags().Lookup(install.FlagSkipEnvDetection))     //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagChartDir, cmd.Flags().Lookup(install.FlagChartDir))                     //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagRepository, cmd.Flags().Lookup(install.FlagRepository))                 //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagHelmSet, cmd.Flags().Lookup(install.FlagHelmSet))                       //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagHelmValuesFiles, cmd.Flags().Lookup(install.FlagHelmValuesFiles))       //nolint:errcheck,gosec

	viper.BindPFlag(install.FlagOperatorMongoDB, cmd.Flags().Lookup(install.FlagOperatorMongoDB))             //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagOperatorPostgresql, cmd.Flags().Lookup(install.FlagOperatorPostgresql))       //nolint:errcheck,gosec
	viper.BindPFlag(install.FlagOperatorXtraDBCluster, cmd.Flags().Lookup(install.FlagOperatorXtraDBCluster)) //nolint:errcheck,gosec

	viper.BindPFlag("verbose", cmd.Flags().Lookup("verbose")) //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))       //nolint:errcheck,gosec
}

func bindInstallHelmOpts(cfg *install.Config) {
	cfg.CLIOptions.Values.Values = viper.GetStringSlice(install.FlagHelmSet)
	cfg.CLIOptions.Values.ValueFiles = viper.GetStringSlice(install.FlagHelmValuesFiles)
	cfg.CLIOptions.ChartDir = viper.GetString(install.FlagChartDir)
	cfg.CLIOptions.RepoURL = viper.GetString(install.FlagRepository)
}
