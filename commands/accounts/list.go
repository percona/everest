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

// NewListCmd returns a new list command.
func NewListCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "list",
		Example: "everestctl accounts list",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initListViperFlags(cmd)
			o := &accounts.ListOptions{}
			err := viper.Unmarshal(o)
			if err != nil {
				os.Exit(1)
			}

			cli, err := accounts.NewCLI(o.KubeconfigPath, l)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if err := cli.List(context.Background(), o); err != nil {
				l.Error(err)
				os.Exit(1)
			}
		},
	}
	initListFlags(cmd)
	return cmd
}

func initListFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("kubeconfig", "k", "~/.kube/config", "Path to a kubeconfig")
	cmd.Flags().Bool("no-headers", false, "If set, hide table headers")
	cmd.Flags().StringSlice("columns", nil, "Comma-separated list of column names to display")
}

func initListViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("no-headers", cmd.Flags().Lookup("no-headers")) //nolint:errcheck,gosec
	viper.BindPFlag("columns", cmd.Flags().Lookup("columns"))       //nolint:errcheck,gosec
}
