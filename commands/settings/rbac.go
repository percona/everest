// Package settings ...
package settings

import (
	"github.com/percona/everest/commands/settings/rbac"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

// NewRBACCmd returns an new RBAC sub-command.
func NewRBACCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "rbac",
		Long:  "Manage RBAC settings",
		Short: "Manage RBAC settings",
	}
	cmd.AddCommand(rbac.NewValidateCommand(l))
	return cmd
}
