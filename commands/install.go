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

	"github.com/percona/everest/pkg/install"
	"github.com/percona/everest/pkg/output"
)

func newInstallCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use: "install",
		// The command expects no arguments. So to prevent users from misspelling and confusion
		// in cases with unexpected spaces like
		//       ./everestctl install --namespaces=aaa, a
		// it will return
		//        Error: unknown command "a" for "everestctl install"
		Args:    cobra.NoArgs,
		Example: "everestctl install --namespaces dev,staging,prod --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard",
		Long:    "Install Percona Everest",
		Short:   "Install Percona Everest",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initInstallViperFlags(cmd)
			c := &install.Config{}
			err := viper.Unmarshal(c)
			if err != nil {
				os.Exit(1)
			}

			op, err := install.NewInstall(*c, l)
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
	initInstallFlags(cmd)

	return cmd
}

func initInstallFlags(cmd *cobra.Command) {
	cmd.Flags().String("namespaces", install.DefaultEverestNamespace, "Comma-separated namespaces list Percona Everest can manage")
	cmd.Flags().Bool("skip-wizard", false, "Skip installation wizard")
	cmd.Flags().String("version-metadata-url", "https://check.percona.com", "URL to retrieve version metadata information from")
	cmd.Flags().String("version", "", "Everest version to install. By default the latest version is installed")

	cmd.Flags().Bool("operator.mongodb", true, "Install MongoDB operator")
	cmd.Flags().Bool("operator.postgresql", true, "Install PostgreSQL operator")
	cmd.Flags().Bool("operator.xtradb-cluster", true, "Install XtraDB Cluster operator")
}

func initInstallViperFlags(cmd *cobra.Command) {
	viper.BindPFlag("skip-wizard", cmd.Flags().Lookup("skip-wizard")) //nolint:errcheck,gosec

	viper.BindEnv("kubeconfig")                                                         //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))                     //nolint:errcheck,gosec
	viper.BindPFlag("namespaces", cmd.Flags().Lookup("namespaces"))                     //nolint:errcheck,gosec
	viper.BindPFlag("version-metadata-url", cmd.Flags().Lookup("version-metadata-url")) //nolint:errcheck,gosec
	viper.BindPFlag("version", cmd.Flags().Lookup("version"))                           //nolint:errcheck,gosec

	viper.BindPFlag("operator.mongodb", cmd.Flags().Lookup("operator.mongodb"))               //nolint:errcheck,gosec
	viper.BindPFlag("operator.postgresql", cmd.Flags().Lookup("operator.postgresql"))         //nolint:errcheck,gosec
	viper.BindPFlag("operator.xtradb-cluster", cmd.Flags().Lookup("operator.xtradb-cluster")) //nolint:errcheck,gosec
}
