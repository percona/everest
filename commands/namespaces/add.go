// Package namespaces provides the namespaces CLI command.
package namespaces

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/output"
)

const (
	defaultDBNamespaces = "everest"
)

// NewAddCommand returns a new command to add a new namespace.
func NewAddCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "add",
		Long:  "Add a new namespace",
		Short: "Add a new namespace",
		Run: func(cmd *cobra.Command, _ []string) {
			initAddViperFlags(cmd)
			c := &namespaces.NamespaceAddConfig{}
			err := viper.Unmarshal(c)
			if err != nil {
				l.Error(err)
				return
			}
			bindInstallHelmOpts(c)

			enableLogging := viper.GetBool("verbose") || viper.GetBool("json")
			c.Pretty = !enableLogging

			askNamespaces := !cmd.Flags().Lookup("namespaces").Changed
			askOperators := !(cmd.Flags().Lookup("operator.mongodb").Changed ||
				cmd.Flags().Lookup("operator.postgresql").Changed ||
				cmd.Flags().Lookup("operator.xtradb-cluster").Changed)

			if err := c.Populate(askNamespaces, askOperators); err != nil {
				output.PrintError(err, l, !enableLogging)
				os.Exit(1)
			}

			op, err := namespaces.NewNamespaceAdd(*c, l)
			if err != nil {
				output.PrintError(err, l, !enableLogging)
				return
			}
			if err := op.Run(cmd.Context()); err != nil {
				output.PrintError(err, l, !enableLogging)
				os.Exit(1)
			}
		},
	}
	initAddFlags(cmd)
	return cmd
}

func initAddFlags(cmd *cobra.Command) {
	cmd.Flags().String(cli.FlagNamespaces, defaultDBNamespaces, "Comma-separated namespaces list namespaces where databases will be created")
	cmd.Flags().Bool(cli.FlagDisableTelemetry, false, "Disable telemetry")
	cmd.Flags().MarkHidden(cli.FlagDisableTelemetry) //nolint:errcheck,gosec
	cmd.Flags().Bool(cli.FlagSkipWizard, false, "Skip installation wizard")
	cmd.Flags().Bool("take-ownership", false, "Take ownership of existing namespaces")

	cmd.Flags().String(helm.FlagChartDir, "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	cmd.Flags().MarkHidden(helm.FlagChartDir) //nolint:errcheck,gosec
	cmd.Flags().String(helm.FlagRepository, helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	cmd.Flags().StringSlice(helm.FlagHelmSet, []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	cmd.Flags().StringSliceP(helm.FlagHelmValues, "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	cmd.Flags().Bool(cli.FlagOperatorMongoDB, true, "Install MongoDB operator")
	cmd.Flags().Bool(cli.FlagOperatorPostgresql, true, "Install PostgreSQL operator")
	cmd.Flags().Bool(cli.FlagOperatorXtraDBCluster, true, "Install XtraDB Cluster operator")
}

func initAddViperFlags(cmd *cobra.Command) {
	viper.BindPFlag(cli.FlagSkipWizard, cmd.Flags().Lookup(cli.FlagSkipWizard))                 //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagNamespaces, cmd.Flags().Lookup(cli.FlagNamespaces))                 //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVersionMetadataURL, cmd.Flags().Lookup(cli.FlagVersionMetadataURL)) //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVersion, cmd.Flags().Lookup(cli.FlagVersion))                       //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagDisableTelemetry, cmd.Flags().Lookup(cli.FlagDisableTelemetry))     //nolint:errcheck,gosec
	viper.BindPFlag("take-ownership", cmd.Flags().Lookup("take-ownership"))                     //nolint:errcheck,gosec

	viper.BindPFlag(helm.FlagChartDir, cmd.Flags().Lookup(helm.FlagChartDir))     //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagRepository, cmd.Flags().Lookup(helm.FlagRepository)) //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmSet, cmd.Flags().Lookup(helm.FlagHelmSet))       //nolint:errcheck,gosec
	viper.BindPFlag(helm.FlagHelmValues, cmd.Flags().Lookup(helm.FlagHelmValues)) //nolint:errcheck,gosec

	viper.BindPFlag(cli.FlagOperatorMongoDB, cmd.Flags().Lookup("operator.mongodb"))              //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagOperatorPostgresql, cmd.Flags().Lookup("operator.postgresql"))        //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagOperatorXtraDBCluster, cmd.Flags().Lookup("operator.xtradb-cluster")) //nolint:errcheck,gosec

	viper.BindEnv(cli.FlagKubeconfig)                                           //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagKubeconfig, cmd.Flags().Lookup(cli.FlagKubeconfig)) //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVerbose, cmd.Flags().Lookup(cli.FlagVerbose))       //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))                         //nolint:errcheck,gosec
}

func bindInstallHelmOpts(cfg *namespaces.NamespaceAddConfig) {
	cfg.CLIOptions.Values.Values = viper.GetStringSlice(helm.FlagHelmSet)
	cfg.CLIOptions.Values.ValueFiles = viper.GetStringSlice(helm.FlagHelmValues)
	cfg.CLIOptions.ChartDir = viper.GetString(helm.FlagChartDir)
	cfg.CLIOptions.RepoURL = viper.GetString(helm.FlagRepository)
}
