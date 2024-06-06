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
	"github.com/percona/everest/pkg/uninstall"
)

// newUninstallCmd returns a new uninstall command.
func newUninstallCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "uninstall",
		Long:  "Uninstall Percona Everest",
		Short: "Uninstall Percona Everest",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initUninstallViperFlags(cmd)
			c, err := parseClusterConfig()
			if err != nil {
				os.Exit(1)
			}

			op, err := uninstall.NewUninstall(*c, l)
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

	initUninstallFlags(cmd)

	return cmd
}

func initUninstallFlags(cmd *cobra.Command) {
	cmd.Flags().BoolP("assume-yes", "y", false, "Assume yes to all questions")
	cmd.Flags().BoolP("force", "f", false, "Force removal in case there are database clusters running")
}

func initUninstallViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("assume-yes", cmd.Flags().Lookup("assume-yes")) //nolint:errcheck,gosec
	viper.BindPFlag("force", cmd.Flags().Lookup("force"))           //nolint:errcheck,gosec
}

func parseClusterConfig() (*uninstall.Config, error) {
	c := &uninstall.Config{}
	err := viper.Unmarshal(c)
	return c, err
}
