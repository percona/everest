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

// Package settings ...
package settings

import (
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/percona/everest/commands/settings/oidc"
)

// NewOIDCCmd returns an new OIDC sub-command.
func NewOIDCCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:  "oidc",
		Long: "Manage settings related to OIDC",
	}

	cmd.AddCommand(oidc.NewConfigureCommand(l))

	return cmd
}
