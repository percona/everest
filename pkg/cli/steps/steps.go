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

// Package steps provides a way to run a function with a pretty loading spinner animation.
package steps

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/briandowns/spinner"

	"github.com/percona/everest/pkg/output"
)

const (
	spinnerInterval = 150 * time.Millisecond
)

// Step provides a way to run a function with a
// pretty loading spinner animation.
type Step struct {
	// Desc is a human readable description of the step.
	Desc string
	// F is the function that will be called to execute the step.
	F func(ctx context.Context) error
}

// RunStepsWithSpinner runs a list of steps with a loading spinner animation.
func RunStepsWithSpinner(
	ctx context.Context,
	steps []Step,
	out io.Writer,
) error {
	s := spinner.New(
		spinner.CharSets[9],
		spinnerInterval,
		spinner.WithWriter(out),
	)
	for _, step := range steps {
		s.Suffix = " " + step.Desc
		s.Start()
		if err := step.F(ctx); err != nil {
			s.Stop()
			fmt.Fprint(out, output.Failure(step.Desc)) //nolint:govet
			fmt.Fprint(out, "\t", err, "\n")
			return err
		}
		s.Stop()
		fmt.Fprint(out, output.Success(step.Desc)) //nolint:govet
	}
	return nil
}
