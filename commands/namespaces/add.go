package namespaces

import (
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

func NewAddCommand(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "add",
		Long:  "Add a new namespace",
		Short: "Add a new namespace",
		Run: func(cmd *cobra.Command, args []string) {

		},
	}
	return cmd
}
