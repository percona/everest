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

// Package token holds commands for token command.
package token

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/output"
	"github.com/percona/everest/pkg/token"
)

// NewResetCmd returns a new versions command.
func NewResetCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use: "reset",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initResetViperFlags(cmd)

			c, err := parseResetConfig()
			if err != nil {
				os.Exit(1)
			}

			c.Namespace = common.SystemNamespace
			command, err := token.NewReset(*c, l)
			if err != nil {
				output.PrintError(err, l)
				os.Exit(1)
			}

			res, err := command.Run(cmd.Context())
			if err != nil {
				output.PrintError(err, l)
				os.Exit(1)
			}

			output.PrintOutput(cmd, l, res)
		},
	}

	initResetFlags(cmd)

	return cmd
}

func initResetFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("kubeconfig", "k", "~/.kube/config", "Path to a kubeconfig")
}

func initResetViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
}

func parseResetConfig() (*token.ResetConfig, error) {
	c := &token.ResetConfig{}
	err := viper.Unmarshal(c)
	return c, err
}
