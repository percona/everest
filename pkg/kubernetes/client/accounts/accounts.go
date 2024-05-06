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

// Package accounts provides functionality for managing Everest user accounts
package accounts

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"slices"
	"strings"
	"time"

	"golang.org/x/crypto/pbkdf2"
	"gopkg.in/yaml.v3"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

// AccountCapability represents a capability of an account.
type AccountCapability string

const (
	// AccountCapabilityLogin represents capability to create UI session tokens.
	AccountCapabilityLogin AccountCapability = "login"
	// AccountCapabilityAPIKey represents capability to generate API auth tokens.
	AccountCapabilityAPIKey AccountCapability = "apiKey"

	usersFile    = "users.yaml"
	passwordFile = "passwords.yaml"
)

// ErrAccountNotFound is returned when an account is not found.
var ErrAccountNotFound = errors.New("account not found")

// User contains user data.
type User struct {
	Enabled      bool                `yaml:"enabled"`
	Capabilities []AccountCapability `yaml:"capabilities"`
}

// Password contains password data.
type Password struct {
	PasswordHash  string `yaml:"passwordHash"`
	PasswordMTime string `yaml:"passwordMTime"`
}

// Account contains user and password data.
type Account struct {
	ID string
	User
	Password
}

// HasCapability returns true if the given account has the specified capability.
func (a Account) HasCapability(c AccountCapability) bool {
	return slices.Contains(a.Capabilities, c)
}

// Client provides functionality for managing user accounts on Kubernetes.
type Client struct {
	k client.KubeClientConnector
}

// New returns a new Kubernetes based account manager for Everest.
func New(k client.KubeClientConnector) *Client {
	return &Client{k: k}
}

// Get returns an account by username.
func (a *Client) Get(ctx context.Context, username string) (*Account, error) {
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return nil, err
	}
	user, found := users[username]
	if !found {
		return nil, ErrAccountNotFound
	}
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return nil, err
	}
	pass, found := passwords[username]
	if !found {
		return nil, ErrAccountNotFound
	}
	return &Account{
		ID:       username,
		User:     user,
		Password: pass,
	}, nil
}

// ResetAdminPassword sets a new password for the admin account.
// This password will not be hashed, so that the user can view, login and reset it.
func (a *Client) ResetAdminPassword(ctx context.Context) error {
	admin, err := a.Get(ctx, common.EverestAdminUser)
	if err != nil {
		return err
	}
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return errors.Join(err, errors.New("failed to generate random password"))
	}
	admin.Password = Password{
		PasswordHash:  hex.EncodeToString(b),
		PasswordMTime: time.Now().Format(time.RFC3339),
	}
	return a.setAccounts(ctx, []Account{*admin}, true)
}

// List returns a list of all accounts.
func (a *Client) List(ctx context.Context) ([]Account, error) {
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return nil, err
	}
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return nil, err
	}
	return mergeUserPassToAccounts(users, passwords), nil
}

// Create a new user account.
func (a *Client) Create(ctx context.Context, username, password string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; found {
		return errors.New("user already exists")
	}
	hash, err := a.computePasswordHash(ctx, password)
	if err != nil {
		return err
	}
	acc := Account{
		ID: username,
		User: User{
			Enabled:      true,
			Capabilities: []AccountCapability{AccountCapabilityLogin}, // XX: for now we only support login
		},
		Password: Password{
			PasswordHash:  hash,
			PasswordMTime: time.Now().Format(time.RFC3339),
		},
	}
	return a.setAccounts(ctx, []Account{acc}, true)
}

func (a *Client) salt(ctx context.Context) ([]byte, error) {
	ns, err := a.k.GetNamespace(ctx, common.SystemNamespace)
	if err != nil {
		return nil, err
	}
	return []byte(ns.UID), nil
}

// Delete an existing user account specified by username.
func (a *Client) Delete(ctx context.Context, username string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; !found {
		return ErrAccountNotFound
	}
	// Remove user from the list.
	delete(users, username)
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return err
	}
	delete(passwords, username)
	acc := mergeUserPassToAccounts(users, passwords)
	return a.setAccounts(ctx, acc, false)
}

// Update an existing user account specified by username.
func (a *Client) Update(ctx context.Context, username, password string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; !found {
		return ErrAccountNotFound
	}
	// Update the password.
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return err
	}
	hash, err := a.computePasswordHash(ctx, password)
	if err != nil {
		return err
	}
	passwords[username] = Password{
		PasswordHash:  hash,
		PasswordMTime: time.Now().Format(time.RFC3339),
	}
	return a.setAccounts(ctx, mergeUserPassToAccounts(users, passwords), true)
}

// ComputePasswordHash computes the password hash for a given password.
func (a *Client) ComputePasswordHash(ctx context.Context, password string) (string, error) {
	return a.computePasswordHash(ctx, password)
}

func (a *Client) computePasswordHash(ctx context.Context, password string) (string, error) {
	salt, err := a.salt(ctx)
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get salt"))
	}
	hash := pbkdf2.Key([]byte(password), salt, 4096, 32, sha256.New)
	return string(hash), nil
}

func mergeUserPassToAccounts(users map[string]User, passwords map[string]Password) []Account {
	accounts := make([]Account, 0, len(users))
	for name, user := range users {
		pass, found := passwords[name]
		if !found {
			continue
		}
		accounts = append(accounts, Account{
			ID:       name,
			User:     user,
			Password: pass,
		})
	}
	slices.SortFunc(accounts, func(a, b Account) int {
		return strings.Compare(a.ID, b.ID)
	})
	return accounts
}

// Given a list of accounts, update the ConfigMap and Secret.
// If patch is true, existing all existing accounts are preserved.
// If patch is false, accounts are replaced with the new list.
func (a *Client) setAccounts(
	ctx context.Context,
	accounts []Account,
	patch bool,
) error {
	var (
		err       error
		users     = make(map[string]User)
		passwords = make(map[string]Password)
	)
	if patch {
		// Get existing users and passwords.
		users, err = a.listAllUsers(ctx)
		if err != nil {
			return err
		}
		passwords, err = a.listAllPasswords(ctx)
		if err != nil {
			return err
		}
		// Modify accounts.
		for _, acc := range accounts {
			users[acc.ID] = acc.User
			passwords[acc.ID] = acc.Password
		}
	} else {
		for _, acc := range accounts {
			users[acc.ID] = acc.User
			passwords[acc.ID] = acc.Password
		}
	}
	if err := a.updateConfigMap(ctx, users); err != nil {
		return err
	}
	if err := a.updateSecret(ctx, passwords); err != nil {
		return err
	}
	return nil
}

func (a *Client) updateConfigMap(ctx context.Context, users map[string]User) error {
	userB, err := yaml.Marshal(users)
	if err != nil {
		return err
	}
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestAccountsConfigName,
			Namespace: common.SystemNamespace,
		},
		BinaryData: map[string][]byte{
			usersFile: userB,
		},
	}
	if _, err := a.k.UpdateConfigMap(ctx, cm); err != nil {
		return err
	}
	return nil
}

func (a *Client) updateSecret(ctx context.Context, passwords map[string]Password) error {
	passB, err := yaml.Marshal(passwords)
	if err != nil {
		return err
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestAccountsConfigName,
			Namespace: common.SystemNamespace,
		},
		Data: map[string][]byte{
			passwordFile: passB,
		},
	}
	if _, err := a.k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	return nil
}

func (a *Client) listAllUsers(ctx context.Context) (map[string]User, error) {
	cm, err := a.k.GetConfigMap(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return nil, err
	}
	usersYaml, found := cm.BinaryData[usersFile]
	if !found {
		return make(map[string]User), nil
	}
	var users map[string]User
	if err := yaml.Unmarshal(usersYaml, &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (a *Client) listAllPasswords(ctx context.Context) (map[string]Password, error) {
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return nil, err
	}
	passwordsYaml, found := secret.Data[passwordFile]
	if !found {
		return make(map[string]Password), nil
	}
	var passwords map[string]Password
	if err := yaml.Unmarshal(passwordsYaml, &passwords); err != nil {
		return nil, err
	}
	return passwords, nil
}
