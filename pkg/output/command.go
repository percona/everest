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

// Package output provides utilities to print output in commands.
package output

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"github.com/AlecAivazis/survey/v2/terminal"
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/percona/everest/commands/common"
)

// PrintOutput prints output as a string or json.
func PrintOutput(cmd *cobra.Command, l *zap.SugaredLogger, output interface{}) {
	outputJSON, err := cmd.Flags().GetBool("json")
	if err != nil {
		l.Errorf("could not parse json global flag. Error: %s", err)
	}

	if !outputJSON {
		fmt.Println(output) //nolint:forbidigo
		return
	}

	out, err := json.Marshal(output)
	if err != nil {
		l.Error("Cannot unmarshal output to JSON")
		os.Exit(1)
	}

	fmt.Println(string(out)) //nolint:forbidigo
}

// PrintError formats and prints an error to logger.
func PrintError(err error, l *zap.SugaredLogger) {
	if errors.Is(err, common.ErrExitWithError) {
		return
	}
	if errors.Is(err, terminal.InterruptErr) {
		l.Info("The command execution is interrupted")
		return
	}

	l.Error(err)
}
