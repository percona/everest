package accounts

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/rodaine/table"
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
		l: l.With("component", "accounts"),
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

func (c *CLI) runCredentialsWizard(username, password *string) error {
	if *username == "" {
		pUsername := survey.Input{
			Message: "Enter username",
		}
		if err := survey.AskOne(&pUsername, username); err != nil {
			return err
		}
	}
	if *password == "" {
		pPassword := survey.Password{
			Message: "Enter password",
		}
		if err := survey.AskOne(&pPassword, password); err != nil {
			return err
		}
	}
	return nil
}

// Create a new user account.
func (c *CLI) Create(ctx context.Context, username, password string) error {
	if err := c.runCredentialsWizard(&username, &password); err != nil {
		return err
	}
	if username == "" {
		return errors.New("username is required")
	}
	if err := c.kubeClient.Accounts().Create(ctx, username, password); err != nil {
		return err
	}
	c.l.Infof("User '%s' has been created", username)
	return nil
}

// Delete an existing user account.
func (c *CLI) Delete(ctx context.Context, username, password string) error {
	if err := c.runCredentialsWizard(&username, &password); err != nil {
		return err
	}
	if username == "" {
		return errors.New("username is required")
	}
	user, err := c.kubeClient.Accounts().Get(ctx, username)
	if err != nil {
		return err
	}
	computedHash, err := c.kubeClient.Accounts().ComputePasswordHash(password)
	if err != nil {
		return err
	}
	if computedHash != user.PasswordHash {
		return errors.New("incorrect password entered")
	}
	c.l.Infof("User '%s' has been deleted", username)
	return c.kubeClient.Accounts().Delete(ctx, username)
}

type ListOptions struct {
	KubeconfigPath string   `mapstructure:"kubeconfig"`
	NoHeaders      bool     `mapstructure:"no-headers"`
	Columns        []string `mapstructure:"columns"`
}

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
