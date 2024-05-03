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

// Package accounts holds commands for accounts command.
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
	accountsapi "github.com/percona/everest/pkg/kubernetes/client/accounts"
)

// CLI provides functionality for managing user accounts via the CLI.
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
	computedHash, err := c.kubeClient.Accounts().ComputePasswordHash(ctx, password)
	if err != nil {
		return err
	}
	if computedHash != user.PasswordHash {
		return errors.New("incorrect password entered")
	}
	c.l.Infof("User '%s' has been deleted", username)
	return c.kubeClient.Accounts().Delete(ctx, username)
}

// ListOptions holds options for listing user accounts.
type ListOptions struct {
	KubeconfigPath string   `mapstructure:"kubeconfig"`
	NoHeaders      bool     `mapstructure:"no-headers"`
	Columns        []string `mapstructure:"columns"`
}

const (
	columnUser         = "user"
	columnCapabilities = "capabilities"
	columnEnabled      = "enabled"
)

// List all user accounts in the system.
func (c *CLI) List(ctx context.Context, opts *ListOptions) error {
	if opts == nil {
		opts = &ListOptions{}
	}
	// Prepare table headings.
	headings := []interface{}{columnUser, columnCapabilities, columnEnabled}
	if len(opts.Columns) > 0 {
		headings = []interface{}{}
		for _, col := range opts.Columns {
			headings = append(headings, col)
		}
	}
	// Prepare table header.
	tbl := table.New(headings...)
	tbl.WithHeaderFormatter(func(format string, vals ...interface{}) string {
		if opts.NoHeaders { // Skip printing headers.
			return ""
		}
		// Otherwise print in all caps.
		return strings.ToUpper(fmt.Sprintf(format, vals...))
	})
	accounts, err := c.kubeClient.Accounts().List(ctx)
	if err != nil {
		return err
	}

	// Return a table row for the given account.
	row := func(account accountsapi.Account) []any {
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
		return row
	}
	for _, account := range accounts {
		tbl.AddRow(row(account)...)
	}
	tbl.Print()
	return nil
}
