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

// Package cli holds commands for accounts command.
package cli

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/rodaine/table"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/accounts"
	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
)

const (
	minPasswordLength = 6
)

// Accounts provides functionality for managing user accounts via the Accounts.
type Accounts struct {
	accountManager accounts.Interface
	l              *zap.SugaredLogger
	config         Config
	kubeClient     *kubernetes.Kubernetes
}

// Config holds the configuration for the accounts subcommands.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string
	// If set, we will print the pretty output.
	Pretty bool
}

// NewAccounts creates a new Accounts for running accounts commands.
func NewAccounts(c Config, l *zap.SugaredLogger) (*Accounts, error) {
	cli := &Accounts{
		l:      l.With("component", "accounts"),
		config: c,
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}

	k, err := cliutils.NewKubeclient(cli.l, c.KubeconfigPath)
	if err != nil {
		return nil, err
	}
	cli.kubeClient = k
	cli.accountManager = k.Accounts()

	return cli, nil
}

// WithAccountManager sets the account manager for the Accounts.
func (c *Accounts) WithAccountManager(m accounts.Interface) {
	c.accountManager = m
}

func (c *Accounts) runCredentialsWizard(username, password *string) error {
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

// SetPasswordOptions holds options for setting a new password for user accounts.
type SetPasswordOptions struct {
	// Username is the username for the account.
	Username string
	// NewPassword is a new password for the account.
	NewPassword string
}

// SetPassword sets the password for an existing account.
func (c *Accounts) SetPassword(ctx context.Context, opts SetPasswordOptions) error {
	if opts.Username == "" {
		pUsername := survey.Input{
			Message: "Enter username",
		}
		if err := survey.AskOne(&pUsername, &opts.Username); err != nil {
			return err
		}
	}

	if opts.Username == "" {
		return errors.New("username is required")
	}

	if opts.NewPassword == "" {
		resp := struct {
			Password     string
			ConfPassword string
		}{}
		if err := survey.Ask([]*survey.Question{
			{
				Name:     "Password",
				Prompt:   &survey.Password{Message: "Enter new password"},
				Validate: survey.Required,
			},
			{
				Name:     "ConfPassword",
				Prompt:   &survey.Password{Message: "Re-enter new password"},
				Validate: survey.Required,
			},
		}, &resp,
		); err != nil {
			return err
		}
		if resp.Password != resp.ConfPassword {
			return errors.New("passwords do not match")
		}
		opts.NewPassword = resp.Password
	}

	c.l.Infof("Setting a new password for user '%s'", opts.Username)
	if ok, msg := validateCredentials(opts.Username, opts.NewPassword); !ok {
		c.l.Error(msg)
		return errors.New("invalid credentials")
	}

	if err := c.accountManager.SetPassword(ctx, opts.Username, opts.NewPassword, true); err != nil {
		return err
	}

	c.l.Infof("Password for user '%s' has been set succesfully", opts.Username)
	if c.config.Pretty {
		_, _ = fmt.Fprintln(os.Stdout, output.Success("Password for user '%s' has been set successfully", opts.Username))
	}

	return nil
}

// CreateOptions holds options for creating a new user accounts.
type CreateOptions struct {
	// Username is the username for the account.
	Username string
	// Password is the password for the account.
	Password string
}

// Create a new user account.
func (c *Accounts) Create(ctx context.Context, opts CreateOptions) error {
	if err := c.runCredentialsWizard(&opts.Username, &opts.Password); err != nil {
		return err
	}

	if ok, msg := validateCredentials(opts.Username, opts.Password); !ok {
		c.l.Error(msg)
		return errors.New("invalid credentials")
	}

	c.l.Infof("Creating user '%s'", opts.Username)
	if err := c.accountManager.Create(ctx, opts.Username, opts.Password); err != nil {
		return err
	}

	c.l.Infof("User '%s' has been created succesfully", opts.Username)
	if c.config.Pretty {
		_, _ = fmt.Fprintln(os.Stdout, output.Success("User '%s' has been created successfully", opts.Username))
	}

	return nil
}

// Delete an existing user account.
func (c *Accounts) Delete(ctx context.Context, username string) error {
	if username == "" {
		if err := survey.AskOne(&survey.Input{
			Message: "Enter username",
		}, &username,
		); err != nil {
			return err
		}
	}
	if username == "" {
		return errors.New("username is required")
	}

	c.l.Infof("Deleting user '%s'", username)
	if err := c.accountManager.Delete(ctx, username); err != nil {
		return err
	}

	c.l.Infof("User '%s' has been deleted succesfully", username)
	if c.config.Pretty {
		_, _ = fmt.Fprintln(os.Stdout, output.Success("User '%s' has been deleted successfully", username))
	}

	return nil
}

// ListOptions holds options for listing user accounts.
type ListOptions struct {
	NoHeaders bool
	Columns   []string
}

const (
	// ColumnUser is the column name for the user.
	ColumnUser = "user"
	// ColumnCapabilities is the column name for the capabilities.
	ColumnCapabilities = "capabilities"
	// ColumnEnabled is the column name for the enabled status.
	ColumnEnabled = "enabled"
)

// List all user accounts in the system.
func (c *Accounts) List(ctx context.Context, opts ListOptions) error {
	// Prepare table headings.
	headings := []interface{}{ColumnUser, ColumnCapabilities, ColumnEnabled}
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
	accountsList, err := c.accountManager.List(ctx)
	if err != nil {
		return err
	}

	// Return a table row for the given account.
	row := func(user string, account *accounts.Account) []any {
		row := []any{}
		for _, heading := range headings {
			switch heading {
			case ColumnUser:
				row = append(row, user)
			case ColumnCapabilities:
				row = append(row, account.Capabilities)
			case ColumnEnabled:
				row = append(row, account.Enabled)
			}
		}
		return row
	}
	for user, a := range accountsList {
		tbl.AddRow(row(user, a)...)
	}
	tbl.Print()
	return nil
}

// GetInitAdminPassword returns the initial admin password.
func (c *Accounts) GetInitAdminPassword(ctx context.Context) (string, error) {
	secure, err := c.accountManager.IsSecure(ctx, common.EverestAdminUser)
	if err != nil {
		return "", err
	}
	if secure {
		return "", errors.New("cannot retrieve admin password after it has been updated")
	}

	admin, err := c.accountManager.Get(ctx, common.EverestAdminUser)
	if err != nil {
		return "", err
	}
	return admin.PasswordHash, nil
}

func validateCredentials(username, password string) (bool, string) {
	if !validateUsername(username) {
		return false,
			"Username must contain only letters, numbers, and underscores, and must be at least 3 characters long"
	}
	if !validatePassword(password) {
		return false,
			"Password must contain only letters, numbers and specific special characters (@#$%^&+=!_), and must be at least 6 characters long"
	}
	return true, ""
}

// CreateRSAKeyPair creates a new RSA key pair for user authentication. New RSA key pair is stored in the Kubernetes secret.
func (c *Accounts) CreateRSAKeyPair(ctx context.Context) error {
	c.l.Info("Creating/Updating JWT keys and restarting Everest.")
	if err := c.kubeClient.CreateRSAKeyPair(ctx); err != nil {
		c.l.Error(err)
		os.Exit(1)
	}

	c.l.Info("JWT keys have been created/updated successfully")
	if c.config.Pretty {
		_, _ = fmt.Fprintln(os.Stdout, output.Success("JWT keys have been created/updated successfully"))
	}
	return nil
}

func validateUsername(username string) bool {
	// Regular expression to validate username.
	// [a-zA-Z0-9_] - Allowed characters (letters, digits, underscore)
	// {3,} - Length of the username (minimum 3 characters)
	pattern := "^[a-zA-Z0-9_]{3,}$"
	regex := regexp.MustCompile(pattern)
	return regex.MatchString(username)
}

func validatePassword(password string) bool {
	if strings.Contains(password, " ") {
		return false
	}
	if len(password) < minPasswordLength {
		return false
	}
	return true
}
