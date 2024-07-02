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

// NewCreateCmd returns a new create command.
func NewCreateCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "create",
		Example: "everestctl accounts create --username user1 --password $USER_PASS",
		Short:   "Create a new Everest user account",
		Long:    "Create a new Everest user account",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initCreateViperFlags(cmd)

			kubeconfigPath := viper.GetString("kubeconfig")
			username := viper.GetString("username")
			password := viper.GetString("password")

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

			if err := cli.Create(context.Background(), username, password); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}
	initCreateFlags(cmd)
	return cmd
}

func initCreateFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("username", "u", "", "Username of the account")
	cmd.Flags().StringP("password", "p", "", "Password of the account")
}

func initCreateViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("username", cmd.Flags().Lookup("username"))     //nolint:errcheck,gosec
	viper.BindPFlag("password", cmd.Flags().Lookup("password"))     //nolint:errcheck,gosec
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}
