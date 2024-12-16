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
	"github.com/percona/everest/pkg/cli/upgrade"
	"github.com/percona/everest/pkg/output"
)

func newUpgradeCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use: "upgrade",
		// The command expects no arguments. So to prevent users from misspelling and confusion
		// in cases with unexpected spaces like
		//       ./everestctl upgrade --namespaces=aaa, a
		// it will return
		//        Error: unknown command "a" for "everestctl upgrade"
		Args:  cobra.NoArgs,
		Long:  "Upgrade Percona Everest using Helm",
		Short: "Upgrade Percona Everest using Helm",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initUpgradeViperFlags(cmd)

			c, err := parseUpgradeConfig()
			if err != nil {
				os.Exit(1)
			}
			c.CLIOptions.BindViperFlags()

			enableLogging := viper.GetBool("verbose") || viper.GetBool("json")
			c.Pretty = !enableLogging

			op, err := upgrade.NewUpgrade(c, l)
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

	initUpgradeFlags(cmd)

	return cmd
}

func initUpgradeFlags(cmd *cobra.Command) {
	cmd.Flags().String(cli.FlagVersionMetadataURL, "https://check.percona.com", "URL to retrieve version metadata information from")
	cmd.Flags().Bool(cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")

	cmd.Flags().String(helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	cmd.Flags().StringSlice(helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	cmd.Flags().StringSliceP(helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")
	cmd.Flags().Bool(helm.FlagHelmReuseValues, false, "Reuse the last release's values and merge in any overrides from the command line via --helm.set and -f")
	cmd.Flags().Bool(helm.FlagHelmResetValues, false, "Reset the values to the ones built into the chart")
	cmd.Flags().Bool(helm.FlagHelmResetThenReuseValues, false, "Reset the values to the ones built into the chart, apply the last release's values and merge in any overrides from the command line via --set and -f.")

	cmd.Flags().BoolP("logs", "l", false, "If set, logs are printed during the upgrade process")
	cmd.Flags().Bool("dry-run", false, "If set, only executes the pre-upgrade checks")
	cmd.Flags().Bool("in-cluster", false, "If set, uses the in-cluster Kubernetes client configuration")
}

func initUpgradeViperFlags(cmd *cobra.Command) {
	viper.BindEnv(cli.FlagKubeconfig)                                                           //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagKubeconfig, cmd.Flags().Lookup(cli.FlagKubeconfig))                 //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVersionMetadataURL, cmd.Flags().Lookup(cli.FlagVersionMetadataURL)) //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVerbose, cmd.Flags().Lookup(cli.FlagVerbose))                       //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))                                         //nolint:errcheck,gosec
	viper.BindPFlag("dry-run", cmd.Flags().Lookup("dry-run"))                                   //nolint:errcheck,gosec
	viper.BindPFlag("in-cluster", cmd.Flags().Lookup("in-cluster"))                             //nolint:errcheck,gosec

	viper.BindPFlag(upgrade.FlagSkipEnvDetection, cmd.Flags().Lookup(upgrade.FlagSkipEnvDetection)) //nolint:errcheck,gosec

	viper.BindPFlag(helm.FlagRepository, cmd.Flags().Lookup(helm.FlagRepository))                             //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmSet, cmd.Flags().Lookup(helm.FlagHelmSet))                                   //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmValues, cmd.Flags().Lookup(helm.FlagHelmValues))                             //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmReuseValues, cmd.Flags().Lookup(helm.FlagHelmReuseValues))                   //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmResetValues, cmd.Flags().Lookup(helm.FlagHelmResetValues))                   //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmResetThenReuseValues, cmd.Flags().Lookup(helm.FlagHelmResetThenReuseValues)) //nolint:errcheck,gosec
}

func parseUpgradeConfig() (*upgrade.Config, error) {
	c := &upgrade.Config{}
	err := viper.Unmarshal(c)
	return c, err
}
