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

// Package commands implements main logic for cli commands.
package commands

import (
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/logger"
)

// NewRootCmd creates a new root command for the cli.
func NewRootCmd(l *zap.SugaredLogger) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "everestctl",
		Long:  "CLI for managing Percona Everest",
		Short: "CLI for managing Percona Everest",
		PersistentPreRun: func(cmd *cobra.Command, args []string) { //nolint:revive
			logger.InitLoggerInRootCmd(cmd, l)
			l.Debug("Debug logging enabled")
		},
	}

	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose mode")
	rootCmd.PersistentFlags().Bool("json", false, "Set output type to JSON")
	rootCmd.PersistentFlags().StringP("kubeconfig", "k", "~/.kube/config", "Path to a kubeconfig")

	rootCmd.AddCommand(newInstallCmd(l))
	rootCmd.AddCommand(newVersionCmd(l))
	rootCmd.AddCommand(newUpgradeCmd(l))
	rootCmd.AddCommand(newUninstallCmd(l))
	rootCmd.AddCommand(newAccountsCmd(l))
	rootCmd.AddCommand(newSettingsCommand(l))

	return rootCmd
}
