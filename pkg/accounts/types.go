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

// Package accounts ...
package accounts

import (
	"context"
	"errors"
	"slices"
)

// AccountCapability represents a capability of an account.
type AccountCapability string

var (
	// ErrAccountNotFound is returned when an account is not found.
	ErrAccountNotFound = errors.New("account not found")
	// ErrIncorrectPassword is returned when the password is invalid.
	ErrIncorrectPassword = errors.New("incorrect password")
	// ErrInsufficientCapabilities is returned when the account does not have the required capabilities.
	ErrInsufficientCapabilities = errors.New("insufficient capabilities")
	// ErrAccountDisabled is returned when the account is disabled.
	ErrAccountDisabled = errors.New("account disabled")
	// ErrUserAlreadyExists is returned when we try to create a user that already exists.
	ErrUserAlreadyExists = errors.New("user already exists")
)

const (
	// AccountCapabilityLogin represents capability to create UI session tokens.
	AccountCapabilityLogin AccountCapability = "login"
	// AccountCapabilityAPIKey represents capability to generate API auth tokens.
	AccountCapabilityAPIKey AccountCapability = "apiKey"
)

// Account is an internal representation of an Everest user account.
type Account struct {
	Enabled       bool                `yaml:"enabled"`
	Capabilities  []AccountCapability `yaml:"capabilities"`
	PasswordMtime string              `yaml:"passwordMtime"`
	PasswordHash  string              `yaml:"passwordHash"`
}

// HasCapability returns true if the given account has the specified capability.
func (a Account) HasCapability(c AccountCapability) bool {
	return slices.Contains(a.Capabilities, c)
}

// Interface provides the methods for managing Everest user accounts.
type Interface interface {
	Create(ctx context.Context, username, password string) error
	Get(ctx context.Context, username string) (*Account, error)
	List(ctx context.Context) (map[string]*Account, error)
	Delete(ctx context.Context, username string) error
	SetPassword(ctx context.Context, username, newPassword string, secure bool) error
	Verify(ctx context.Context, username, password string) error
	IsSecure(ctx context.Context, username string) (bool, error)
}
