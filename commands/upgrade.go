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

// Package commands ...
package commands

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/output"
	"github.com/percona/everest/pkg/upgrade"
)

func newUpgradeCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use: "upgrade",
		// The command expects no arguments. So to prevent users from misspelling and confusion
		// in cases with unexpected spaces like
		//       ./everestctl upgrade --namespaces=aaa, a
		// it will return
		//        Error: unknown command "a" for "everestctl upgrade"
		Args:  cobra.NoArgs,
		Long:  "Upgrade Percona Everest",
		Short: "Upgrade Percona Everest",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initUpgradeViperFlags(cmd)

			c, err := parseUpgradeConfig()
			if err != nil {
				os.Exit(1)
			}

			op, err := upgrade.NewUpgrade(c, l)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if err := op.Run(cmd.Context()); err != nil {
				output.PrintError(err, l)
				os.Exit(1)
			}
		},
	}

	initUpgradeFlags(cmd)

	return cmd
}

func initUpgradeFlags(cmd *cobra.Command) {
	cmd.Flags().String("version-metadata-url", "https://check.percona.com", "URL to retrieve version metadata information from")
}

func initUpgradeViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                                         //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))                     //nolint:errcheck,gosec
	viper.BindPFlag("version-metadata-url", cmd.Flags().Lookup("version-metadata-url")) //nolint:errcheck,gosec
}

func parseUpgradeConfig() (*upgrade.Config, error) {
	c := &upgrade.Config{}
	err := viper.Unmarshal(c)
	return c, err
}
