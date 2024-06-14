// Package accounts holds commands for accounts command.
package accounts

import (
	"context"
	"errors"
	"net/url"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
)

// NewResetJWTKeysCommand returns a new reset-jwt-keys command.
func NewResetJWTKeysCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "reset-jwt-keys",
		Example: "everestctl accounts reset-jwt-keys",
		Long:    "Reset the JWT keys used for Everest user authentication",
		Short:   "Reset the JWT keys used for Everest user authentication",
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
			l.Info("Creating/Updating JWT keys and restarting Everest..")
			if err := k.CreateRSAKeyPair(ctx); err != nil {
				l.Error(err)
				os.Exit(1)
			}

			l.Info("JWT keys created/updated successfully!")
		},
	}
	return cmd
}
