// list.go
package clusters

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/percona/everest/pkg/cli"
	clusterscli "github.com/percona/everest/pkg/clusters/cli"
	"github.com/percona/everest/pkg/logger"
	"github.com/percona/everest/pkg/output"
)

var (
	clustersListCmd = &cobra.Command{
		Use:     "list [flags]",
		Args:    cobra.NoArgs,
		Example: "everestctl clusters list --no-headers",
		Long:    "List all kubernetes clusters",
		Short:   "List all kubernetes clusters",
		PreRun:  clustersListPreRun,
		Run:     clustersListRun,
	}
	clustersListCfg  = &clusterscli.Config{}
	clustersListOpts = &clusterscli.ListOptions{}
)

func init() {
	// local command flags
	clustersListCmd.Flags().BoolVar(&clustersListOpts.NoHeaders, "no-headers", false, "If set, hide table headers")
	clustersListCmd.Flags().StringSliceVar(&clustersListOpts.Columns, "columns", nil,
		fmt.Sprintf("Comma-separated list of column names to display. Supported columns: %s, %s.",
			clusterscli.ColumnName, clusterscli.ColumnServer,
		),
	)
}

func clustersListPreRun(cmd *cobra.Command, _ []string) { //nolint:revive
	// Copy global flags to config
	clustersListCfg.Pretty = !(cmd.Flag(cli.FlagVerbose).Changed || cmd.Flag(cli.FlagJSON).Changed)
	clustersListCfg.KubeconfigPath = cmd.Flag(cli.FlagKubeconfig).Value.String()
}

func clustersListRun(cmd *cobra.Command, _ []string) { //nolint:revive
	cliA, err := clusterscli.NewClusters(*clustersListCfg, logger.GetLogger())
	if err != nil {
		output.PrintError(err, logger.GetLogger(), clustersListCfg.Pretty)
		os.Exit(1)
	}

	if err := cliA.List(cmd.Context(), *clustersListOpts); err != nil {
		output.PrintError(err, logger.GetLogger(), clustersListCfg.Pretty)
		os.Exit(1)
	}
}

// GetListCmd returns the command to list all clusters.
func GetListCmd() *cobra.Command {
	return clustersListCmd
}
