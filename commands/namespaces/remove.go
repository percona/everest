// Package namespaces provides the namespaces CLI command.
package namespaces

import (
	"errors"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/output"
)

const forceUninstallHint = "HINT: use --force to remove the namespace and all its resources"

// NewRemoveCommand returns a new command to remove an existing namespace.
func NewRemoveCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "remove [flags] NAMESPACES",
		Long:    "Remove an existing and managed by Everest namespaces",
		Short:   "Remove an existing and managed by Everest namespaces",
		Example: `everestctl namespaces remove --keep-namespace --force ns-1,ns-2`,
		Args:    cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			initRemoveViperFlags(cmd)
			c := &namespaces.NamespaceRemoveConfig{}
			err := viper.Unmarshal(c)
			if err != nil {
				l.Error(err)
				return
			}
			c.Namespaces = args[0]

			enableLogging := viper.GetBool("verbose") || viper.GetBool("json")
			c.Pretty = !enableLogging

			if err := c.Populate(cmd.Context()); err != nil {
				if errors.Is(err, namespaces.ErrNamespaceNotEmpty) {
					err = fmt.Errorf("%w. %s", err, forceUninstallHint)
				}
				output.PrintError(err, l, !enableLogging)
				os.Exit(1)
			}

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
	cmd.Flags().Bool("keep-namespace", false, "If set, preserves the Kubernetes namespace but removes all resources managed by Everest")
	cmd.Flags().Bool("force", false, "If set, forcefully deletes database clusters in the namespace (if any)")
}

func initRemoveViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("keep-namespace", cmd.Flags().Lookup("keep-namespace")) //nolint:errcheck,gosec
	viper.BindPFlag("force", cmd.Flags().Lookup("force"))                   //nolint:errcheck,gosec

	viper.BindEnv(cli.FlagKubeconfig)                                           //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagKubeconfig, cmd.Flags().Lookup(cli.FlagKubeconfig)) //nolint:errcheck,gosec
	viper.BindPFlag(cli.FlagVerbose, cmd.Flags().Lookup(cli.FlagVerbose))       //nolint:errcheck,gosec
	viper.BindPFlag("json", cmd.Flags().Lookup("json"))                         //nolint:errcheck,gosec
}
