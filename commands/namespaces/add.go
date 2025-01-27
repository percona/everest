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

//nolint:gochecknoglobals
var (
	takeOwnershipHintMessage = fmt.Sprintf("HINT: set '--%s' flag to use existing namespaces", cli.FlagTakeNamespaceOwnership)
	updateHintMessage        = "HINT: use 'everestctl namespaces update' to update the namespace"
	namespacesAddCmd         = &cobra.Command{
		Use:     "add <namespaces> [flags]",
		Args:    cobra.ExactArgs(1),
		Long:    "Add a new namespace and make managed by Everest",
		Short:   "Add a new namespace and make managed by Everest",
		Example: `everestctl namespaces add ns-1,ns-2 --skip-wizard --operator.xtradb-cluster=true --operator.postgresql=false --operator.mongodb=false`,
		PreRun:  namespacesAddPreRun,
		Run:     namespacesAddRun,
	}
	namespacesAddCfg = &namespaces.NamespaceAddConfig{}
)

func init() {
	// local command flags
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.DisableTelemetry, cli.FlagDisableTelemetry, false, "Disable telemetry")
	_ = namespacesAddCmd.Flags().MarkHidden(cli.FlagDisableTelemetry) //nolint:errcheck,gosec
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.SkipWizard, cli.FlagSkipWizard, false, "Skip installation wizard")
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.TakeOwnership, cli.FlagTakeNamespaceOwnership, false, "If the specified namespace already exists, take ownership of it")
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.SkipEnvDetection, cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")

	// --helm.* flags
	namespacesAddCmd.Flags().StringVar(&namespacesAddCfg.CLIOptions.ChartDir, helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	_ = namespacesAddCmd.Flags().MarkHidden(helm.FlagChartDir) //nolint:errcheck,gosec
	namespacesAddCmd.Flags().StringVar(&namespacesAddCfg.CLIOptions.RepoURL, helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	namespacesAddCmd.Flags().StringSliceVar(&namespacesAddCfg.CLIOptions.Values.Values, helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	namespacesAddCmd.Flags().StringSliceVarP(&namespacesAddCfg.CLIOptions.Values.ValueFiles, helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	// --operator.* flags
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.Operator.PSMDB, cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.Operator.PG, cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	namespacesAddCmd.Flags().BoolVar(&namespacesAddCfg.Operator.PXC, cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func namespacesAddPreRun(cmd *cobra.Command, args []string) { //nolint:revive
	namespacesAddCfg.Namespaces = args[0]

	// Copy global flags to config
	namespacesAddCfg.Pretty = !(cmd.Flag(cli.FlagVerbose).Changed || cmd.Flag(cli.FlagJSON).Changed)
	namespacesAddCfg.KubeconfigPath = cmd.Flag(cli.FlagKubeconfig).Value.String()

	// If user doesn't pass any --operator.* flags - need to ask explicitly.
	namespacesAddCfg.AskOperators = !(cmd.Flags().Lookup(cli.FlagOperatorMongoDB).Changed ||
		cmd.Flags().Lookup(cli.FlagOperatorPostgresql).Changed ||
		cmd.Flags().Lookup(cli.FlagOperatorXtraDBCluster).Changed)
}

func namespacesAddRun(cmd *cobra.Command, _ []string) {
	op, err := namespaces.NewNamespaceAdd(*namespacesAddCfg, logger.GetLogger())
	if err != nil {
		logger.GetLogger().Error(err)
		os.Exit(1)
	}

	if err := op.Run(cmd.Context()); err != nil {
		if errors.Is(err, namespaces.ErrNamespaceAlreadyExists) {
			err = fmt.Errorf("%w. %s", err, takeOwnershipHintMessage)
		}
		if errors.Is(err, namespaces.ErrNamespaceAlreadyOwned) {
			err = fmt.Errorf("%w. %s", err, updateHintMessage)
		}
		output.PrintError(err, logger.GetLogger(), namespacesAddCfg.Pretty)
		os.Exit(1)
	}
}

// GetNamespacesAddCmd returns the command to add namespaces.
func GetNamespacesAddCmd() *cobra.Command {
	return namespacesAddCmd
}
