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

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/install"
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
		Long:    "Install Percona Everest using Helm",
		Short:   "Install Percona Everest using Helm",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initInstallViperFlags(cmd)
			c := &install.Config{}
			err := viper.Unmarshal(c)
			if err != nil {
				os.Exit(1)
			}
			c.CLIOptions.BindViperFlags()

			if c.SkipDBNamespace {
				if cmd.Flags().Lookup(cli.FlagNamespaces).Changed {
					l.Errorf("cannot set both --%s and --%s", cli.FlagInstallSkipDBNamespace, cli.FlagNamespaces)
					os.Exit(1)
				}
				c.Namespaces = ""
			}

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
	cmd.Flags().String(cli.FlagNamespaces, install.DefaultDBNamespaceName, "Comma-separated namespaces list Percona Everest can manage")
	cmd.Flags().Bool(cli.FlagSkipWizard, false, "Skip installation wizard")
	cmd.Flags().String(cli.FlagVersionMetadataURL, "https://check.percona.com", "URL to retrieve version metadata information from")
	cmd.Flags().String(cli.FlagVersion, "", "Everest version to install. By default the latest version is installed")
	cmd.Flags().Bool(cli.FlagDisableTelemetry, false, "Disable telemetry")
	cmd.Flags().MarkHidden(cli.FlagDisableTelemetry) //nolint:errcheck,gosec
	cmd.Flags().Bool(cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")
	cmd.Flags().Bool(cli.FlagInstallSkipDBNamespace, false, "Skip creating a database namespace with install")

	cmd.Flags().String(helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	cmd.Flags().MarkHidden(helm.FlagChartDir) //nolint:errcheck,gosec
	cmd.Flags().String(helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	cmd.Flags().StringSlice(helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	cmd.Flags().StringSliceP(helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	cmd.Flags().Bool(cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
	cmd.Flags().Bool(cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	cmd.Flags().Bool(cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func initInstallViperFlags(cmd *cobra.Command) {
	viper.BindPFlag(cli.FlagSkipWizard, cmd.Flags().Lookup(cli.FlagSkipWizard)) //nolint:errcheck,gosec

	viper.BindEnv(cli.FlagKubeconfig)                                                                   //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagKubeconfig, cmd.Flags().Lookup(cli.FlagKubeconfig))                         //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagNamespaces, cmd.Flags().Lookup(cli.FlagNamespaces))                         //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVersionMetadataURL, cmd.Flags().Lookup(cli.FlagVersionMetadataURL))         //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVersion, cmd.Flags().Lookup(cli.FlagVersion))                               //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagDisableTelemetry, cmd.Flags().Lookup(cli.FlagDisableTelemetry))             //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagSkipEnvDetection, cmd.Flags().Lookup(cli.FlagSkipEnvDetection))             //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagInstallSkipDBNamespace, cmd.Flags().Lookup(cli.FlagInstallSkipDBNamespace)) //nolint:errcheck,gosec

	viper.BindPFlag(helm.FlagChartDir, cmd.Flags().Lookup(helm.FlagChartDir))     //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagRepository, cmd.Flags().Lookup(helm.FlagRepository)) //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmSet, cmd.Flags().Lookup(helm.FlagHelmSet))       //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmValues, cmd.Flags().Lookup(helm.FlagHelmValues)) //nolint:errcheck,gosec

	viper.BindPFlag(cli.FlagOperatorMongoDB, cmd.Flags().Lookup(cli.FlagOperatorMongoDB))             //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagOperatorPostgresql, cmd.Flags().Lookup(cli.FlagOperatorPostgresql))       //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagOperatorXtraDBCluster, cmd.Flags().Lookup(cli.FlagOperatorXtraDBCluster)) //nolint:errcheck,gosec

	viper.BindPFlag(cli.FlagVerbose, cmd.Flags().Lookup(cli.FlagVerbose)) //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))                   //nolint:errcheck,gosec
}
