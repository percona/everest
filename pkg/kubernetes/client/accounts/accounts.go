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
	"crypto/sha256"
	"errors"
	"time"

	"golang.org/x/crypto/pbkdf2"
	"gopkg.in/yaml.v3"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

type AccountCapability string

const (
	// AccountsConfigMapName is the name of the ConfigMap that holds account information.
	AccountsConfigMapName = "everest-accounts"

	// AccountCapabilityLogin represents capability to create UI session tokens.
	AccountCapabilityLogin AccountCapability = "login"
	// AccountCapabilityLogin represents capability to generate API auth tokens.
	AccountCapabilityApiKey AccountCapability = "apiKey"

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

type accounts struct {
	k client.KubeClientConnector
}

// New returns a new Kubernetes based account manager for Everest.
func New(k client.KubeClientConnector) *accounts {
	return &accounts{k: k}
}

// Get returns an account by username.
func (a *accounts) Get(ctx context.Context, username string) (*Account, error) {
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

// List returns a list of all accounts.
func (a *accounts) List(ctx context.Context) ([]Account, error) {
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
func (a *accounts) Create(ctx context.Context, username, password string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; found {
		return errors.New("user already exists")
	}
	salt, err := a.salt()
	if err != nil {
		return errors.Join(err, errors.New("failed to get salt"))
	}
	hash := pbkdf2.Key([]byte(password), salt, 4096, 32, sha256.New)
	acc := Account{
		ID: username,
		User: User{
			Enabled:      true,
			Capabilities: []AccountCapability{AccountCapabilityLogin}, // XX: for now we only support login
		},
		Password: Password{
			PasswordHash:  string(hash),
			PasswordMTime: time.Now().Format(time.RFC3339),
		},
	}
	return a.setAccounts(ctx, []Account{acc})
}

func (a *accounts) salt() ([]byte, error) {
	ns, err := a.k.GetNamespace(context.Background(), common.SystemNamespace)
	if err != nil {
		return nil, err
	}
	return []byte(ns.UID), nil
}

// Delete an existing user account specified by username.
func (a *accounts) Delete(ctx context.Context, username string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; !found {
		return errors.New("user does not exist")
	}
	// Remove user from the list.
	delete(users, username)
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return err
	}
	delete(passwords, username)
	acc := mergeUserPassToAccounts(users, passwords)
	return a.setAccounts(ctx, acc)
}

// Update an existing user account specified by username.
func (a *accounts) Update(ctx context.Context, username, password string) error {
	// Check if this user exists?
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	if _, found := users[username]; !found {
		return errors.New("user does not exist")
	}
	// Update the password.
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return err
	}
	salt, err := a.salt()
	if err != nil {
		return errors.Join(err, errors.New("failed to get salt"))
	}
	hash := pbkdf2.Key([]byte(password), salt, 4096, 32, sha256.New)
	passwords[username] = Password{
		PasswordHash:  string(hash),
		PasswordMTime: time.Now().Format(time.RFC3339),
	}
	return nil
}

func mergeUserPassToAccounts(users map[string]User, passwords map[string]Password) []Account {
	var accounts []Account
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
	return accounts
}

func (a *accounts) setAccounts(
	ctx context.Context,
	accounts []Account,
) error {
	// Get existing users and passwords.
	users, err := a.listAllUsers(ctx)
	if err != nil {
		return err
	}
	passwords, err := a.listAllPasswords(ctx)
	if err != nil {
		return err
	}
	// Modify accounts.
	for _, acc := range accounts {
		users[acc.ID] = acc.User
		passwords[acc.ID] = acc.Password
	}
	// Update accounts ConfigMap.
	userB, err := yaml.Marshal(users)
	if err != nil {
		return err
	}
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      AccountsConfigMapName,
			Namespace: common.SystemNamespace,
		},
		BinaryData: map[string][]byte{
			usersFile: userB,
		},
	}
	if _, err := a.k.UpdateConfigMap(ctx, cm); err != nil {
		return err
	}
	// Update Accounts Secret.
	passB, err := yaml.Marshal(passwords)
	if err != nil {
		return err
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      AccountsConfigMapName,
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

func (a *accounts) listAllUsers(ctx context.Context) (map[string]User, error) {
	cm, err := a.k.GetConfigMap(ctx, common.SystemNamespace, AccountsConfigMapName)
	if err != nil {
		return nil, err
	}
	usersYaml, found := cm.BinaryData[usersFile]
	if !found {
		return nil, ErrAccountNotFound
	}
	var users map[string]User
	if err := yaml.Unmarshal(usersYaml, &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (a *accounts) listAllPasswords(ctx context.Context) (map[string]Password, error) {
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, AccountsConfigMapName)
	if err != nil {
		return nil, err
	}
	passwordsYaml, found := secret.Data[passwordFile]
	if !found {
		return nil, ErrAccountNotFound
	}
	var passwords map[string]Password
	if err := yaml.Unmarshal(passwordsYaml, &passwords); err != nil {
		return nil, err
	}
	return passwords, nil
}
