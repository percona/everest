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

	accountscli "github.com/percona/everest/pkg/accounts/cli"
	"github.com/percona/everest/pkg/kubernetes"
)

// NewDeleteCmd returns a new delete command.
func NewDeleteCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "delete",
		Example: "everestctl accounts delete --username user1",
		Short:   "Delete an existing Everest user account",
		Long:    "Delete an existing Everest user account",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initDeleteViperFlags(cmd)

			kubeconfigPath := viper.GetString("kubeconfig")
			username := viper.GetString("username")

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

			if err := cli.Delete(context.Background(), username); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}
	initDeleteFlags(cmd)
	return cmd
}

func initDeleteFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("username", "u", "", "Username of the account")
}

func initDeleteViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("username", cmd.Flags().Lookup("username"))     //nolint:errcheck,gosec
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}
