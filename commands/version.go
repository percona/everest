package commands

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/version"
)

func newVersionCmd(l *zap.SugaredLogger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "version",
		Long:  "Print version info",
		Short: "Print version info",
		Run: func(cmd *cobra.Command, args []string) { //nolint:revive
			outputJSON, err := cmd.Flags().GetBool("json")
			if err != nil {
				l.Errorf("could not parse json global flag. Error: %s", err)
				os.Exit(1)
				return
			}
			kubeConfigPath, err := cmd.Flags().GetString("kubeconfig")
			if err != nil {
				l.Errorf("could not parse kubeconfig global flag. Error: %s", err)
				os.Exit(1)
				return
			}

			clientOnly, err := cmd.Flags().GetBool("client-only")
			if err != nil {
				l.Errorf("could not parse client-only flag. Error: %s", err)
				os.Exit(1)
				return
			}

			v := version.Info{
				ProjectName: version.ProjectName,
				Version:     version.Version,
				FullCommit:  version.FullCommit,
			}

			if !clientOnly {
				var err error
				k, err := utils.NewKubeclient(l, kubeConfigPath)
				if err != nil {
					os.Exit(1)
					return
				}
				ev, err := version.EverestVersionFromDeployment(cmd.Context(), k)
				if client.IgnoreNotFound(err) != nil {
					l.Error(err)
					os.Exit(1)
				}
				sv := "[NOT INSTALLED]"
				if ev != nil {
					sv = fmt.Sprintf("v%s", ev.String())
				}
				v.ServerVersion = &sv
			}

			if !outputJSON {
				fmt.Fprintln(os.Stdout, v)
				return
			}
			fmt.Fprintln(os.Stdout, v.JSONString())
		},
	}
	initVersionFlags(cmd)
	return cmd
}

func initVersionFlags(cmd *cobra.Command) {
	cmd.Flags().Bool("client-only", false, "Print client version only")
}
