// remove.go
package clusters

import (
	"github.com/spf13/cobra"
)

func GetRemoveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "remove",
		Short: "Remove a k8s cluster",
		Run: func(cmd *cobra.Command, args []string) {
			// TODO: Implement remove logic
			cmd.Println("Remove cluster")
		},
	}
}
