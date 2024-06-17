package common

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
)

// Step is a helper type for organising the steps of long running
// CLI operations like install, uninstall, upgrades, etc.
type Step struct {
	// Desc is a human readable description of the step.
	Desc string
	// F is the function that will be called to execute the step.
	F func(ctx context.Context) error
}

var (
	okStatus   = color.New(color.FgGreen).SprintFunc()("\u2713")           // √
	failStatus = color.New(color.FgRed, color.Bold).SprintFunc()("\u00D7") // ×
)

func RunStepsWithSpinner(
	ctx context.Context,
	steps []Step,
	out io.Writer,
) error {
	s := spinner.New(
		spinner.CharSets[9],
		150*time.Millisecond,
		spinner.WithWriter(out),
	)
	for _, step := range steps {
		s.Suffix = " " + step.Desc
		s.Start()
		if err := step.F(ctx); err != nil {
			s.Stop()
			fmt.Fprint(out, failStatus, " ", step.Desc, "\n")
			fmt.Fprint(out, "\t", err, "\n")
			return err
		}
		s.Stop()
		fmt.Fprint(out, okStatus, " ", step.Desc, "\n")
	}
	return nil
}
