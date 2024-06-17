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

// NewListCmd returns a new list command.
func NewListCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "list",
		Example: "everestctl accounts list",
		Long:    "List all Everest user accounts",
		Short:   "List all Everest user accounts",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initListViperFlags(cmd)
			o := &accountscli.ListOptions{}
			err := viper.Unmarshal(o)
			if err != nil {
				os.Exit(1)
			}
			kubeconfigPath := viper.GetString("kubeconfig")

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
	cmd.Flags().Bool("no-headers", false, "If set, hide table headers")
	cmd.Flags().StringSlice("columns", nil, "Comma-separated list of column names to display")
}

func initListViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("no-headers", cmd.Flags().Lookup("no-headers")) //nolint:errcheck,gosec
	viper.BindPFlag("columns", cmd.Flags().Lookup("columns"))       //nolint:errcheck,gosec
}
