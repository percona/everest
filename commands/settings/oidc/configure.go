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

// Package oidc ...
package oidc

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/oidc"
	"github.com/percona/everest/pkg/output"
)

// NewConfigureCommand returns the command to configure OIDC.
func NewConfigureCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "configure",
		Long:  "Configure OIDC settings",
		Short: "Configure OIDC settings",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initOIDCViperFlags(cmd)
			c, err := parseOIDCConfig()
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			op, err := oidc.NewOIDC(*c, l)
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

	initOIDCFlags(cmd)

	return cmd
}

func initOIDCFlags(cmd *cobra.Command) {
	cmd.Flags().String("issuer-url", "", "OIDC issuer url")
	cmd.Flags().String("client-id", "", "ID of the client OIDC app")
}

func initOIDCViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                     //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig")) //nolint:errcheck,gosec
	viper.BindPFlag("issuer-url", cmd.Flags().Lookup("issuer-url")) //nolint:errcheck,gosec
	viper.BindPFlag("client-id", cmd.Flags().Lookup("client-id"))   //nolint:errcheck,gosec
}

func parseOIDCConfig() (*oidc.Config, error) {
	c := &oidc.Config{}
	err := viper.Unmarshal(c)
	return c, err
}
