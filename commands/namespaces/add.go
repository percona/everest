package namespaces

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/output"
)

func NewAddCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "add",
		Long:  "Add a new namespace",
		Short: "Add a new namespace",
		Run: func(cmd *cobra.Command, args []string) {
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
	cmd.Flags().String("namespaces", "", "Comma-separated namespaces list namespaces where databases will be created")
	cmd.Flags().Bool("disable-telemetry", false, "Disable telemetry")
	cmd.Flags().MarkHidden("disable-telemetry")
	cmd.Flags().Bool("take-ownership", false, "Take ownership of existing namespaces")
	cmd.Flags().Bool("skip-wizard", false, "Skip installation wizard")

	cmd.Flags().String("chart-dir", "", "Path to the chart directory. If not set, the chart will be downloaded from the repository")
	cmd.Flags().MarkHidden("chart-dir") //nolint:errcheck,gosec
	cmd.Flags().String("repository", helm.DefaultHelmRepoURL, "Helm chart repository to download the Everest charts from")
	cmd.Flags().StringSlice("helm-set", []string{}, "Set helm values on the command line (can specify multiple values with commas: key1=val1,key2=val2)")
	cmd.Flags().StringSliceP("helm-values", "f", []string{}, "Specify values in a YAML file or a URL (can specify multiple)")

	cmd.Flags().Bool("operator.mongodb", true, "Install MongoDB operator")
	cmd.Flags().Bool("operator.postgresql", true, "Install PostgreSQL operator")
	cmd.Flags().Bool("operator.xtradb-cluster", true, "Install XtraDB Cluster operator")
}

func initAddViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("skip-wizard", cmd.Flags().Lookup("skip-wizard")) //nolint:errcheck,gosec
	viper.BindPFlag("namespaces", cmd.Flags().Lookup("namespaces"))   //nolint:errcheck,gosec
	viper.BindPFlag("version-metadata-url", cmd.Flags().Lookup("version-metadata-url"))
	viper.BindPFlag("version", cmd.Flags().Lookup("version"))
	viper.BindPFlag("disable-telemetry", cmd.Flags().Lookup("disable-telemetry"))
	viper.BindPFlag("take-ownership", cmd.Flags().Lookup("take-ownership"))

	viper.BindPFlag("chart-dir", cmd.Flags().Lookup("chart-dir")) //nolint:errcheck,gosec
	viper.BindPFlag("repository", cmd.Flags().Lookup("repository"))
	viper.BindPFlag("helm-set", cmd.Flags().Lookup("helm-set"))
	viper.BindPFlag("helm-values", cmd.Flags().Lookup("helm-values"))

	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("verbose", cmd.Flags().Lookup("verbose"))       //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))             //nolint:errcheck,gosec
}

func bindInstallHelmOpts(cfg *namespaces.NamespaceAddConfig) {
	cfg.CLIOptions.Values.Values = viper.GetStringSlice("helm-set")
	cfg.CLIOptions.Values.ValueFiles = viper.GetStringSlice("helm-values")
	cfg.CLIOptions.ChartDir = viper.GetString("chart-dir")
	cfg.CLIOptions.RepoURL = viper.GetString("repository")
}
