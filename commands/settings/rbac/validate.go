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

// Package rbac ...
package rbac

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"

	"github.com/casbin/casbin/v2"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
	"github.com/percona/everest/pkg/rbac"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

// NewValidateCommand returns a new command for validating RBAC.
func NewValidateCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "validate",
		Long:  "Validate RBAC settings",
		Short: "Validate RBAC settings",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			initValidateViperFlags(cmd)

			_, err := newEnforcer(cmd.Context(), l)
			if err != nil {
				var u *url.Error
				if errors.As(err, &u) {
					l.Error("Could not connect to Kubernetes. " +
						"Make sure Kubernetes is running and is accessible from this computer/server.")
					os.Exit(1)
				}
				fmt.Fprintf(os.Stdout, output.Failure("Invalid"), ": ", err.Error())
				os.Exit(1)
			}
			fmt.Fprintf(os.Stdout, output.Success("Valid"))
		},
	}
	initValidateFlags(cmd)
	return cmd
}

func newEnforcer(
	ctx context.Context,
	l *zap.SugaredLogger) (enf *casbin.Enforcer, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
			enf = nil
		}
	}()

	if filePath := viper.GetString("policy-file"); filePath != "" {
		return rbac.NewEnforcerFromFilePath(context.Background(), filePath)
	}

	kubeconfigPath := viper.GetString("kubeconfig")
	k, err := kubernetes.New(kubeconfigPath, l)
	if err != nil {
		return nil, err
	}
	return rbac.NewEnforcer(ctx, k, l)
}

func initValidateFlags(cmd *cobra.Command) {
	cmd.Flags().String("policy-file", "", "Path to the policy file to use")
}

func initValidateViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                       //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))   //nolint:errcheck,gosec
	viper.BindPFlag("policy-file", cmd.Flags().Lookup("policy-file")) //nolint:errcheck,gosec
}
