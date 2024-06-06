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
	"regexp"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/rodaine/table"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/accounts"
)

// CLI provides functionality for managing user accounts via the CLI.
type CLI struct {
	accountManager accounts.Interface
	l              *zap.SugaredLogger
}

// New creates a new CLI for running accounts commands.
func New(l *zap.SugaredLogger) *CLI {
	return &CLI{
		l: l.With("component", "accounts"),
	}
}

// WithAccountManager sets the account manager for the CLI.
func (c *CLI) WithAccountManager(m accounts.Interface) {
	c.accountManager = m
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

// SetPassword sets the password for an existing account.
func (c *CLI) SetPassword(ctx context.Context, username, password string) error {
	if username == "" {
		pUsername := survey.Input{
			Message: "Enter username",
		}
		if err := survey.AskOne(&pUsername, username); err != nil {
			return err
		}
	}

	if username == "" {
		return errors.New("username is required")
	}

	if password == "" {
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
		password = resp.Password
	}

	if ok, msg := validateCredentials(username, password); !ok {
		c.l.Error(msg)
		return errors.New("invalid credentials")
	}

	if err := c.accountManager.SetPassword(ctx, username, password, true); err != nil {
		return err
	}
	c.l.Infof("Password updated for user '%s'", username)
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

	if ok, msg := validateCredentials(username, password); !ok {
		c.l.Error(msg)
		return errors.New("invalid credentials")
	}

	if err := c.accountManager.Create(ctx, username, password); err != nil {
		return err
	}
	c.l.Infof("User '%s' has been created", username)
	return nil
}

// Delete an existing user account.
func (c *CLI) Delete(ctx context.Context, username string) error {
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
	return c.accountManager.Delete(ctx, username)
}

// ListOptions holds options for listing user accounts.
type ListOptions struct {
	NoHeaders bool     `mapstructure:"no-headers"`
	Columns   []string `mapstructure:"columns"`
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
	accountsList, err := c.accountManager.List(ctx)
	if err != nil {
		return err
	}

	// Return a table row for the given account.
	row := func(user string, account *accounts.Account) []any {
		row := []any{}
		for _, heading := range headings {
			switch heading {
			case "user":
				row = append(row, user)
			case "capabilities":
				row = append(row, account.Capabilities)
			case "enabled":
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
	if len(password) < 6 {
		return false
	}
	return true
}
