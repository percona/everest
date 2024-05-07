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
	"time"

	"golang.org/x/crypto/pbkdf2"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

const (
	usersFile               = "users.yaml"
	tempAdminPasswordSecret = "everest-admin-temp"
)

type configMapsClient struct {
	k client.KubeClientConnector
}

// New returns an implementation of the accounts interface that
// manages everest accounts directly via ConfigMaps.
//
//nolint:ireturn
func New(k client.KubeClientConnector) accounts.Interface {
	return &configMapsClient{k: k}
}

// Get returns an account by username.
func (a *configMapsClient) Get(ctx context.Context, username string) (*accounts.Account, error) {
	users, err := a.listAllAccounts(ctx)
	if err != nil {
		return nil, err
	}
	user, found := users[username]
	if !found {
		return nil, accounts.ErrAccountNotFound
	}
	return user, nil
}

// List returns a list of all accounts.
func (a *configMapsClient) List(ctx context.Context) (map[string]*accounts.Account, error) {
	return a.listAllAccounts(ctx)
}

func (a *configMapsClient) listAllAccounts(ctx context.Context) (map[string]*accounts.Account, error) {
	result := make(map[string]*accounts.Account)
	cm, err := a.k.GetConfigMap(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return nil, err
	}
	if err := yaml.Unmarshal([]byte(cm.Data[usersFile]), result); err != nil {
		return nil, err
	}
	return result, nil
}

// Create a new user account.
func (a *configMapsClient) Create(ctx context.Context, username, password string) error {
	if username == common.EverestAdminUser && password == "" {
		return a.createAdminWithTempPassword(ctx)
	}
	account := &accounts.Account{
		Enabled:       true,
		Capabilities:  []accounts.AccountCapability{accounts.AccountCapabilityLogin},
		PasswordMtime: time.Now().Format(time.RFC3339),
	}
	if err := a.setAccount(ctx, username, account); err != nil {
		return err
	}
	if err := a.setPassword(ctx, username, password); err != nil {
		return err
	}
	return nil
}

func (a *configMapsClient) createAdminWithTempPassword(ctx context.Context) error {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	password := hex.EncodeToString(b)
	tempAdminSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      tempAdminPasswordSecret,
			Namespace: common.SystemNamespace,
		},
		Data: map[string][]byte{
			"password": []byte(password),
		},
	}
	// This temporary secret is deleted once the admin password is reset.
	if _, err := a.k.CreateSecret(ctx, tempAdminSecret); err != nil {
		return err
	}
	if err := a.setAccount(ctx, common.EverestAdminUser, &accounts.Account{
		Enabled:       true,
		Capabilities:  []accounts.AccountCapability{accounts.AccountCapabilityLogin},
		PasswordMtime: time.Now().Format(time.RFC3339),
	}); err != nil {
		return err
	}
	return nil
}

func (a *configMapsClient) setPassword(ctx context.Context, username, password string) error {
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return err
	}
	hash, err := a.computePasswordHash(ctx, password)
	if err != nil {
		return errors.Join(err, errors.New("failed to compute hash"))
	}
	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[username] = []byte(hash)
	if _, err := a.k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	return nil
}

func (a *configMapsClient) setAccount(ctx context.Context, username string, account *accounts.Account) error {
	cm, err := a.k.GetConfigMap(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return err
	}
	accounts := make(map[string]*accounts.Account)
	if err := yaml.Unmarshal([]byte(cm.Data[usersFile]), &accounts); err != nil {
		return err
	}
	accounts[username] = account
	data, err := yaml.Marshal(accounts)
	if err != nil {
		return err
	}
	if cm.Data == nil {
		cm.Data = make(map[string]string)
	}
	cm.Data[usersFile] = string(data)
	if _, err := a.k.UpdateConfigMap(ctx, cm); err != nil {
		return err
	}
	return nil
}

func (a *configMapsClient) salt(ctx context.Context) ([]byte, error) {
	ns, err := a.k.GetNamespace(ctx, common.SystemNamespace)
	if err != nil {
		return nil, err
	}
	return []byte(ns.UID), nil
}

// Delete an existing user account specified by username.
func (a *configMapsClient) Delete(ctx context.Context, username string) error {
	users, err := a.listAllAccounts(ctx)
	if err != nil {
		return err
	}
	// Update ConfigMap.
	delete(users, username)
	b, err := yaml.Marshal(users)
	if err != nil {
		return err
	}
	cmData := map[string]string{
		usersFile: string(b),
	}
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestAccountsConfigName,
			Namespace: common.SystemNamespace,
		},
		Data: cmData,
	}
	if _, err := a.k.UpdateConfigMap(ctx, cm); err != nil {
		return err
	}
	// Update Secret.
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return err
	}
	secretData := secret.Data
	delete(secretData, username)
	secret.Data = secretData
	if _, err := a.k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	return nil
}

func (a *configMapsClient) Verify(ctx context.Context, username, password string) error {
	if username == common.EverestAdminUser {
		if shouldSkip, err := a.tryVerifyTempAdminPassword(ctx, password); !shouldSkip {
			return err
		}
	}
	users, err := a.listAllAccounts(ctx)
	if err != nil {
		return err
	}
	_, found := users[username]
	if !found {
		return accounts.ErrAccountNotFound
	}
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, common.EverestAccountsConfigName)
	if err != nil {
		return err
	}
	computedHash, err := a.computePasswordHash(ctx, password)
	if err != nil {
		return err
	}
	storedhash, found := secret.Data[username]
	if !found {
		return accounts.ErrAccountNotFound
	}
	if string(storedhash) != computedHash {
		return accounts.ErrIncorrectPassword
	}
	return nil
}

// try to check with the temporary password.
// Returns: [skip(bool), error]
func (a *configMapsClient) tryVerifyTempAdminPassword(ctx context.Context, password string) (bool, error) {
	secret, err := a.k.GetSecret(ctx, common.SystemNamespace, tempAdminPasswordSecret)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return true, nil
		}
		return false, err
	}
	if string(secret.Data["password"]) != password {
		return false, accounts.ErrIncorrectPassword
	}
	return false, nil
}

func (a *configMapsClient) computePasswordHash(ctx context.Context, password string) (string, error) {
	salt, err := a.salt(ctx)
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get salt"))
	}
	hash := pbkdf2.Key([]byte(password), salt, 4096, 32, sha256.New)
	return string(hash), nil
}
