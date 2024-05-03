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
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/accounts"
)

type CreateConfig struct {
	Username       string `mapstructure:"username"`
	Password       string `mapstructure:"password"`
	KubeconfigPath string `mapstructure:"kubeconfig"`
}

// NewCreateCmd returns a new create command.
func NewCreateCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "create",
		Example: "everestctl accounts create --username user1 --password $USER_PASS",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initCreateViperFlags(cmd)
			c := &CreateConfig{}
			err := viper.Unmarshal(c)
			if err != nil {
				os.Exit(1)
			}

			cli, err := accounts.NewCLI(c.KubeconfigPath, l)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if err := cli.Create(context.Background(), c.Username, c.Password); err != nil {
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
	cmd.Flags().StringP("kubeconfig", "k", "~/.kube/config", "Path to a kubeconfig")
}

func initCreateViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("username", cmd.Flags().Lookup("username"))
	viper.BindPFlag("password", cmd.Flags().Lookup("password"))
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}
