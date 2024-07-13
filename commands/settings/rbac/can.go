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
	"errors"
	"fmt"
	"net/url"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/rbac"
)

const canCmdExamples = `
Examples:
# Check if user 'alice' can get 'cluster-1' in namespace 'my-namespace'
$ everestctl settings rbac can alice read database-clusters my-namespace/cluster-1

# Check if user 'alice' can perform all/any actions on 'cluster-1' in namespace 'my-namespace'
$ everestctl settings rbac can alice '*' database-clusters my-namespace/cluster-1

# Check if role 'adminrole' can update backup 'prod-backup-1' in namespace 'prod-namespace'
$ everestctl settings rbac can adminrole:role update database-cluster-backups prod-namespace/prod-backup-1

# Check if user 'bob' can delete all/any backups in namespace 'prod-namespace'
$ everestctl settings rbac can bob delete database-cluster-backups prod-namespace/*

# Check if user 'alice' can perform all/any actions on all backups in all namespaces
$ everestctl settings rbac can alice '*' database-cluster-backups '*'

NOTE: The asterisk character (*) holds a special meaning in the unix shell.
To prevent misinterpretation, you need to add single quotes around it.
`

// NewCanCommand returns a new command for testing RBAC.
func NewCanCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "can SUBJECT ACTION RESOURCE SUBRESOURCE",
		Long:    `Test RBAC policy.` + "\n" + canCmdExamples,
		Short:   "Test RBAC policy",
		Example: "everestctl settings rbac can alice read database-clusters all",
		Run: func(cmd *cobra.Command, args []string) {
			initCanViperFlags(cmd)

			kubeconfigPath := viper.GetString("kubeconfig")
			policyFilepath := viper.GetString("policy-file")
			if kubeconfigPath == "" && policyFilepath == "" {
				l.Error("Either --kubeconfig or --policy-file must be set")
				os.Exit(1)
			}

			var k *kubernetes.Kubernetes
			if kubeconfigPath != "" && policyFilepath == "" {
				client, err := kubernetes.New(kubeconfigPath, l)
				if err != nil {
					var u *url.Error
					if errors.As(err, &u) || errors.Is(err, clientcmd.ErrEmptyConfig) {
						l.Error("Could not connect to Kubernetes. " +
							"Make sure Kubernetes is running and is accessible from this computer/server.")
					}
					os.Exit(1)
				}
				k = client
			}

			if len(args) != 4 { //nolint:mnd
				l.Error("invalid number of arguments provided")
				if err := cmd.Usage(); err != nil {
					panic(err)
				}
				os.Exit(1)
			}

			can, err := rbac.Can(cmd.Context(), policyFilepath, k, args...)
			if err != nil {
				l.Error(err)
				os.Exit(1)
			}

			if can {
				fmt.Fprintln(os.Stdout, "Yes")
				return
			}
			fmt.Fprintln(os.Stdout, "No")
		},
	}
	initCanFlags(cmd)
	return cmd
}

func initCanFlags(cmd *cobra.Command) {
	cmd.Flags().String("policy-file", "", "Path to the policy file to use")
}

func initCanViperFlags(cmd *cobra.Command) {
	viper.BindEnv("kubeconfig")                                       //nolint:errcheck,gosec
	viper.BindPFlag("kubeconfig", cmd.Flags().Lookup("kubeconfig"))   //nolint:errcheck,gosec
	viper.BindPFlag("policy-file", cmd.Flags().Lookup("policy-file")) //nolint:errcheck,gosec
}
