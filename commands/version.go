package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/version"
)

func newVersionCmd(l *zap.SugaredLogger) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Long:  "Print version info",
		Short: "Print version info",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			outputJSON, err := cmd.Flags().GetBool("json")
			if err != nil {
				l.Errorf("could not parse json global flag. Error: %s", err)
				return
			}
			if !outputJSON {
				fmt.Println(version.FullVersionInfo()) //nolint:forbidigo
				return
			}
			version, err := version.FullVersionJSON()
			if err != nil {
				l.Errorf("could not print JSON. Error: %s", err)
				return
			}
			fmt.Println(version) //nolint:forbidigo
		},
	}
}
