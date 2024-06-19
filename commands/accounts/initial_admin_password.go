// Package accounts holds commands for accounts command.
package accounts

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

// NewInitialAdminPasswdCommand returns a new initial-admin-passwd command.
func NewInitialAdminPasswdCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "initial-admin-password",
		Example: "everestctl accounts initial-admin-password",
		Long:    "Get the initial admin password for Everest",
		Short:   "Get the initial admin password for Everest",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
			viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
			kubeconfigPath := viper.GetString("kubeconfig")

			k, err := kubernetes.New(kubeconfigPath, l)
			if err != nil {
				var u *url.Error
				if errors.As(err, &u) {
					l.Error("Could not connect to Kubernetes. " +
						"Make sure Kubernetes is running and is accessible from this computer/server.")
				}
				os.Exit(1)
			}

			ctx := context.Background()
			secure, err := k.Accounts().IsSecure(ctx, common.EverestAdminUser)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}
			if secure {
				l.Error("Cannot retrieve admin password after it has been updated.")
				os.Exit(1)
			}
			admin, err := k.Accounts().Get(ctx, common.EverestAdminUser)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}
			fmt.Fprint(os.Stdout, admin.PasswordHash+"\n")
		},
	}
	return cmd
}
