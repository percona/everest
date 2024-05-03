package accounts

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
	"github.com/rodaine/table"
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
	if err := c.kubeClient.Accounts().Create(ctx, username, password); err != nil {
		return err
	}
	c.l.Infof("User '%s' has been added", username)
	return nil
}

type ListOptions struct {
	KubeconfigPath string   `mapstructure:"kubeconfig"`
	NoHeaders      bool     `mapstructure:"no-headers"`
	Columns        []string `mapstructure:"columns"`
}

//	tbl.WithHeaderFormatter(func(format string, vals ...interface{}) string {
//	  return strings.ToUpper(fmt.Sprintf(format, vals...))
//	})

// List all user accounts in the system.
func (c *CLI) List(ctx context.Context, opts *ListOptions) error {
	if opts == nil {
		opts = &ListOptions{}
	}
	headings := []interface{}{"user", "capabilities"}
	if len(opts.Columns) > 0 {
		headings = []interface{}{}
		for _, col := range opts.Columns {
			headings = append(headings, col)
		}
	}
	tbl := table.New(headings...)
	tbl.WithHeaderFormatter(func(format string, vals ...interface{}) string {
		if opts.NoHeaders {
			return ""
		}
		return strings.ToUpper(fmt.Sprintf(format, vals...))
	})
	accounts, err := c.kubeClient.Accounts().List(ctx)
	if err != nil {
		return err
	}
	for _, account := range accounts {
		row := []any{}
		for _, heading := range headings {
			switch heading {
			case "user":
				row = append(row, account.ID)
			case "capabilities":
				row = append(row, account.Capabilities)
			case "enabled":
				row = append(row, account.Enabled)
			}
		}
		tbl.AddRow(row...)
	}
	tbl.Print()
	return nil
}
