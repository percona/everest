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
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/accounts"
)

// NewCreateCmd returns a new create command.
func NewCreateCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "create",
		Example: "everestctl accounts create --username user1 --password $USER_PASS",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initDeleteViperFlags(cmd)

			kubeconfigPath := viper.GetString("kubeconfig")
			username := viper.GetString("username")
			password := viper.GetString("password")

			cli, err := accounts.NewCLI(kubeconfigPath, l)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if err := cli.Create(context.Background(), username, password); err != nil {
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
	cmd.Flags().StringP("password", "p", "", "Password of the account")
	cmd.Flags().StringP("kubeconfig", "k", "~/.kube/config", "Path to a kubeconfig")
}

func initDeleteViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("username", cmd.Flags().Lookup("username"))     //nolint:errcheck,gosec
	viper.BindPFlag("password", cmd.Flags().Lookup("password"))     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}
