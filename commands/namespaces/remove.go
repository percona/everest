// Package namespaces provides the namespaces CLI command.
package namespaces

import (
	"errors"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/output"
)

func NewRemoveCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "remove",
		Long:    "Remove an existing namespace",
		Short:   "Remove an existing namespace",
		Example: `everest namespaces remove [NAMESPACE] [FLAGS]`,
		Run: func(cmd *cobra.Command, args []string) {
			initRemoveViperFlags(cmd)
			c := &namespaces.NamespaceRemoveConfig{}
			err := viper.Unmarshal(c)
			if err != nil {
				l.Error(err)
				return
			}

			if len(args) == 0 {
				output.PrintError(errors.New("no namespace specified"), l, true)
			}
			namespace := args[0]
			c.Namespaces = []string{namespace}

			enableLogging := viper.GetBool("verbose") || viper.GetBool("json")
			c.Pretty = !enableLogging

			op, err := namespaces.NewNamespaceRemove(*c, l)
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
	initRemoveFlags(cmd)
	return cmd
}

func initRemoveFlags(cmd *cobra.Command) {
	cmd.Flags().Bool("keep-namespace", false, "If set, the Kubernetes namespace will not be deleted")
	cmd.Flags().Bool("force", false, "If set, deletes any existing database clusters in the namespace")
}

func initRemoveViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("keep-namespace", cmd.Flags().Lookup("keep-namespace")) //nolint:errcheck,gosec
	viper.BindPFlag("force", cmd.Flags().Lookup("force"))                   //nolint:errcheck,gosec

	viper.BindEnv(cli.FlagKubeconfig)                                           //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagKubeconfig, cmd.Flags().Lookup(cli.FlagKubeconfig)) //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVerbose, cmd.Flags().Lookup(cli.FlagVerbose))       //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))                         //nolint:errcheck,gosec
}
