// clusters.go
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

package commands

import (
	"github.com/spf13/cobra"

	"github.com/percona/everest/commands/clusters"
)

var clustersCmd = &cobra.Command{
	Use:   "clusters <command> [flags]",
	Args:  cobra.ExactArgs(1),
	Long:  "Manage k8s clusters",
	Short: "Manage k8s clusters",
	Run:   func(_ *cobra.Command, _ []string) {},
}

func init() {
	rootCmd.AddCommand(clustersCmd)

	clustersCmd.AddCommand(clusters.GetAddCmd())
	clustersCmd.AddCommand(clusters.GetListCmd())
	clustersCmd.AddCommand(clusters.GetRemoveCmd())
}
