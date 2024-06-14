// Package accounts holds commands for accounts command.
//
//nolint:dupl
package accounts

import (
	"context"
	"errors"
	"net/url"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	accountscli "github.com/percona/everest/pkg/accounts/cli"
	"github.com/percona/everest/pkg/kubernetes"
)

// NewSetPwCommand returns a new set-password command.
func NewSetPwCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "set-password",
		Example: "everestctl accounts set-password --username user1 --new-password $USER_PASS",
		Long:    "Set a new password for an existing Everest user account",
		Short:   "Set a new password for an existing Everest user account",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initSetPwViperFlags(cmd)

			kubeconfigPath := viper.GetString("kubeconfig")
			username := viper.GetString("username")
			password := viper.GetString("new-password")

			k, err := kubernetes.New(kubeconfigPath, l)
			if err != nil {
				var u *url.Error
				if errors.As(err, &u) {
					l.Error("Could not connect to Kubernetes. " +
						"Make sure Kubernetes is running and is accessible from this computer/server.")
				}
				os.Exit(0)
			}

			cli := accountscli.New(l)
			cli.WithAccountManager(k.Accounts())

			if err := cli.SetPassword(context.Background(), username, password); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}
	initSetPwFlags(cmd)
	return cmd
}

func initSetPwFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("username", "u", "", "Username of the account")
	cmd.Flags().StringP("new-password", "p", "", "New password for the account")
}

func initSetPwViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("username", cmd.Flags().Lookup("username"))         //nolint:errcheck,gosec
	viper.BindPFlag("new-password", cmd.Flags().Lookup("new-password")) //nolint:errcheck,gosec
	viper.BindEnv("kubeconfig")                                         //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))     //nolint:errcheck,gosec
}
