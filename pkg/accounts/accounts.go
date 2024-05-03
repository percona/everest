package accounts

import (
	"context"
	"errors"
	"net/url"

	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
)

type CLI struct {
	kubeClient *kubernetes.Kubernetes
	l          *zap.SugaredLogger
}

// NewCLI creates a new CLI for running accounts commands.
func NewCLI(kubeConfigPath string, l *zap.SugaredLogger) (*CLI, error) {
	cli := &CLI{
		l: l.With("comoent", "accounts"),
	}
	k, err := kubernetes.New(kubeConfigPath, l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			cli.l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	cli.kubeClient = k
	return cli, nil
}

// Create a new user account.
func (c *CLI) Create(ctx context.Context, username, password string) error {
	return c.kubeClient.Accounts().Create(ctx, username, password)
}
