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

// Package namespaces provides the namespaces CLI command.
package namespaces

import (
    "errors"
    "fmt"
    "os"

    "github.com/spf13/cobra"

    "github.com/percona/everest/pkg/cli"
    "github.com/percona/everest/pkg/cli/helm"
    "github.com/percona/everest/pkg/cli/namespaces"
    "github.com/percona/everest/pkg/logger"
    "github.com/percona/everest/pkg/output"
)

var (
    namespacesUpdateCmd = &cobra.Command{
        Use:     "update <namespaces> [flags] ",
        Args:    cobra.ExactArgs(1),
        Long:    "Add database operator to existing namespace managed by Everest",
        Short:   "Add database operator to existing namespace managed by Everest",
        Example: `everestctl namespaces update ns-1,ns-2 --skip-wizard --operator.xtradb-cluster=true --operator.postgresql=false --operator.mongodb=false`,
        PreRun:  namespacesUpdatePreRun,
        Run:     namespacesUpdateRun,
    }
    namespacesUpdateCfg = &namespaces.NamespaceAddConfig{}
)

func init() {
    // local command flags
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.DisableTelemetry, cli.FlagDisableTelemetry, false, "Disable telemetry")
    _ = namespacesUpdateCmd.Flags().MarkHidden(cli.FlagDisableTelemetry) //nolint:errcheck,gosec
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.SkipWizard, cli.FlagSkipWizard, false, "Skip installation wizard")
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.SkipEnvDetection, cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")

    // --helm.* flags
    namespacesUpdateCmd.Flags().StringVar(&namespacesUpdateCfg.CLIOptions.ChartDir, helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
    _ = namespacesUpdateCmd.Flags().MarkHidden(helm.FlagChartDir) //nolint:errcheck,gosec
    namespacesUpdateCmd.Flags().StringVar(&namespacesUpdateCfg.CLIOptions.RepoURL, helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
    namespacesUpdateCmd.Flags().StringSliceVar(&namespacesUpdateCfg.CLIOptions.Values.Values, helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
    namespacesUpdateCmd.Flags().StringSliceVarP(&namespacesUpdateCfg.CLIOptions.Values.ValueFiles, helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

    // --operator.* flags
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.Operator.PSMDB, cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.Operator.PG, cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
    namespacesUpdateCmd.Flags().BoolVar(&namespacesUpdateCfg.Operator.PXC, cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func namespacesUpdatePreRun(cmd *cobra.Command, args []string) { //nolint:revive
    namespacesUpdateCfg.Namespaces = args[0]
    namespacesUpdateCfg.Update = true

    // Copy global flags to config
    namespacesUpdateCfg.Pretty = !(cmd.Flag(cli.FlagVerbose).Changed || cmd.Flag(cli.FlagJSON).Changed)
    namespacesUpdateCfg.KubeconfigPath = cmd.Flag(cli.FlagKubeconfig).Value.String()

    // If user doesn't pass any --operator.* flags - need to ask explicitly.
    namespacesUpdateCfg.AskOperators = !(cmd.Flags().Lookup(cli.FlagOperatorMongoDB).Changed ||
        cmd.Flags().Lookup(cli.FlagOperatorPostgresql).Changed ||
        cmd.Flags().Lookup(cli.FlagOperatorXtraDBCluster).Changed)
}

func namespacesUpdateRun(cmd *cobra.Command, _ []string) {
    op, err := namespaces.NewNamespaceAdd(*namespacesUpdateCfg, logger.GetLogger())
    if err != nil {
        logger.GetLogger().Error(err)
        os.Exit(1)
    }

    if err := op.Run(cmd.Context()); err != nil {
        if errors.Is(err, namespaces.ErrNamespaceNotManagedByEverest) {
            err = fmt.Errorf("%w. HINT: use 'everestctl namespaces add --%s %s' first to make namespace managed by Everest",
                err,
                cli.FlagTakeNamespaceOwnership,
                namespacesUpdateCfg.Namespaces,
            )
        }

        output.PrintError(err, logger.GetLogger(), namespacesAddCfg.Pretty)
        os.Exit(1)
    }
}

// GetNamespacesUpdateCmd returns the command to update namespaces.
func GetNamespacesUpdateCmd() *cobra.Command {
    return namespacesUpdateCmd
}
