// add.go
package clusters

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/namespaces"
	clusterscli "github.com/percona/everest/pkg/clusters/cli"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/logger"
	"github.com/percona/everest/pkg/output"
)

var (
	clustersAddCmd = &cobra.Command{
		Use:     "add <context-name> [flags]",
		Args:    cobra.ExactArgs(1),
		Example: "everestctl clusters add development",
		Short:   "Add a new k8s cluster",
		Long:    "Add a new k8s cluster and install Everest on it",
		PreRun:  clustersAddPreRun,
		Run:     clustersAddRun,
	}

	namespacesToAdd string
	clustersAddCfg  = &clusterscli.Config{}
	clustersAddOpts = &clusterscli.AddOptions{}
)

func init() {
	// local command flags
	clustersAddCmd.Flags().StringVar(&namespacesToAdd, cli.FlagNamespaces, common.DefaultDBNamespaceName, "Comma-separated namespaces list Percona Everest can manage")
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.NamespaceAddConfig.SkipWizard, cli.FlagSkipWizard, false, "Skip installation wizard")
	clustersAddCmd.Flags().StringVar(&clustersAddOpts.VersionMetadataURL, cli.FlagVersionMetadataURL, "https://check.percona.com", "URL to retrieve version metadata information from")
	clustersAddCmd.Flags().StringVar(&clustersAddOpts.Version, cli.FlagVersion, "", "Everest version to install. By default the latest version is installed")
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.DisableTelemetry, cli.FlagDisableTelemetry, false, "Disable telemetry")
	_ = clustersAddCmd.Flags().MarkHidden(cli.FlagDisableTelemetry)
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.SkipEnvDetection, cli.FlagSkipEnvDetection, false, "Skip detecting Kubernetes environment where Everest is installed")
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.SkipDBNamespace, cli.FlagInstallSkipDBNamespace, false, "Skip creating a database namespace with install")

	// --namespaces and --skip-db-namespace flags are mutually exclusive
	clustersAddCmd.MarkFlagsMutuallyExclusive(cli.FlagNamespaces, cli.FlagInstallSkipDBNamespace)

	// --helm.* flags
	clustersAddCmd.Flags().StringVar(&clustersAddOpts.HelmConfig.ChartDir, helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	_ = clustersAddCmd.Flags().MarkHidden(helm.FlagChartDir)
	clustersAddCmd.Flags().StringVar(&clustersAddOpts.HelmConfig.RepoURL, helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	clustersAddCmd.Flags().StringSliceVar(&clustersAddOpts.HelmConfig.Values.Values, helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	clustersAddCmd.Flags().StringSliceVarP(&clustersAddOpts.HelmConfig.Values.ValueFiles, helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	// --operator.* flags
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.NamespaceAddConfig.Operators.PSMDB, cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.NamespaceAddConfig.Operators.PG, cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.NamespaceAddConfig.Operators.PXC, cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
	_ = clustersAddCmd.Flags().MarkDeprecated(cli.FlagOperatorXtraDBCluster, fmt.Sprintf("please use --%s instead", cli.FlagOperatorMySQL))
	clustersAddCmd.Flags().BoolVar(&clustersAddOpts.NamespaceAddConfig.Operators.PXC, cli.FlagOperatorMySQL, true, "Install MySQL operator")
}

func clustersAddPreRun(cmd *cobra.Command, args []string) { //nolint:revive
	// Copy global flags to config
	clustersAddCfg.Pretty = !(cmd.Flag(cli.FlagVerbose).Changed || cmd.Flag(cli.FlagJSON).Changed)
	clustersAddCfg.KubeconfigPath = cmd.Flag(cli.FlagKubeconfig).Value.String()

	clustersAddOpts.Name = args[0]
	clustersAddOpts.NamespaceAddConfig.Pretty = clustersAddCfg.Pretty
	clustersAddOpts.NamespaceAddConfig.KubeconfigPath = clustersAddCfg.KubeconfigPath

	// Parse and validate provided namespaces if any
	if cmd.Flag(cli.FlagNamespaces).Changed {
		nsList := namespaces.ParseNamespaceNames(namespacesToAdd)
		if err := clustersAddOpts.NamespaceAddConfig.ValidateNamespaces(cmd.Context(), nsList); err != nil {
			output.PrintError(err, logger.GetLogger(), clustersAddCfg.Pretty)
			os.Exit(1)
		}
		clustersAddOpts.NamespaceAddConfig.NamespaceList = nsList
	}
}

func clustersAddRun(cmd *cobra.Command, _ []string) { //nolint:revive
	cliA, err := clusterscli.NewClusters(*clustersAddCfg, logger.GetLogger())
	if err != nil {
		output.PrintError(err, logger.GetLogger(), clustersAddCfg.Pretty)
		os.Exit(1)
	}

	if err := cliA.Add(cmd.Context(), *clustersAddOpts); err != nil {
		output.PrintError(err, logger.GetLogger(), clustersAddCfg.Pretty)
		os.Exit(1)
	}
}

// GetAddCmd returns the command to create a new user account.
func GetAddCmd() *cobra.Command {
	return clustersAddCmd
}
