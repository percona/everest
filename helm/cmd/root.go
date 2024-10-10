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

// Package commands implements main logic for Helm hook commands.
package commands

import (
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/logger"
)

// NewRootCmd creates a new root command for the helm tools.
func NewRootCmd(l *zap.SugaredLogger) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:  "everest-helm-tools",
		Long: "CLI for executing Helm chart hooks",
		PersistentPreRun: func(cmd *cobra.Command, args []string) { //nolint:revive
			logger.InitLoggerInRootCmd(cmd, l)
			l.Debug("Debug logging enabled")
		},
	}
	rootCmd.PersistentFlags().StringP("kubeconfig", "k", "", "Path to a kubeconfig")
	rootCmd.PersistentFlags().BoolP("verbose", "v", true, "Enable verbose mode")
	rootCmd.PersistentFlags().Bool("json", false, "Set output type to JSON")

	rootCmd.AddCommand(newHooksCommand(l))
	return rootCmd
}
