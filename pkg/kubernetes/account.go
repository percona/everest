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

// Package kubernetes ...
package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"

	"github.com/percona/everest/pkg/common"
)

const (
	accountPasswordSuffix      = "password"
	accountPasswordMtimeSuffix = "passwordMtime"
	accountEnabledSuffix       = "enabled"
	accountTokensSuffix        = "tokens"
)

type AccountCapability string

const (
	// AccountsConfigMapName is the name of the ConfigMap that holds account information.
	AccountsConfigMapName = "everest-accounts"

	// AccountCapabilityLogin represents capability to create UI session tokens.
	AccountCapabilityLogin AccountCapability = "login"
	// AccountCapabilityLogin represents capability to generate API auth tokens.
	AccountCapabilityApiKey AccountCapability = "apiKey"
)

// Token holds the information about the generated auth token.
type Token struct {
	ID        string `json:"id"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp,omitempty"`
}

// Account holds local account information
type Account struct {
	PasswordHash  string
	PasswordMtime *time.Time
	Enabled       bool
	Capabilities  []AccountCapability
	Tokens        []Token
}

// ListAccounts returns list of managed backup storages.
func (k *Kubernetes) ListAccounts(ctx context.Context) (map[string]Account, error) {
	secret, err := k.client.GetSecret(ctx, common.SystemNamespace, AccountsConfigMapName)
	if err != nil {
		return nil, err
	}

	cm, err := k.client.GetConfigMap(ctx, common.SystemNamespace, AccountsConfigMapName)
	if err != nil {
		return nil, err
	}

	return parseAccounts(secret, cm)
}

// GetAccount returns backup storages by provided name.
func (k *Kubernetes) GetAccount(ctx context.Context, name string) (*Account, error) {
	accounts, err := k.ListAccounts(ctx)
	if err != nil {
		return nil, err
	}

	account, ok := accounts[name]
	if !ok {
		return nil, fmt.Errorf("account '%s' does not exist", name)
	}

	return &account, nil
}

// HasCapability return true if the account has the specified capability.
func (a *Account) HasCapability(capability AccountCapability) bool {
	for _, c := range a.Capabilities {
		if c == capability {
			return true
		}
	}
	return false
}

func parseAccounts(secret *corev1.Secret, cm *corev1.ConfigMap) (map[string]Account, error) {
	var err error
	accounts := map[string]Account{}

	for key, v := range cm.Data {
		val := v
		var accountName, suffix string

		parts := strings.Split(key, ".")
		switch len(parts) {
		case 1:
			accountName = parts[0]
		case 2:
			accountName = parts[0]
			suffix = parts[1]
		default:
			// log.Warnf("Unexpected key %s in ConfigMap '%s'", key, cm.Name)
			continue
		}

		account, ok := accounts[accountName]
		if !ok {
			account = Account{Enabled: true}
			accounts[accountName] = account
		}
		switch suffix {
		case "":
			for _, capability := range strings.Split(val, ",") {
				capability = strings.TrimSpace(capability)
				if capability == "" {
					continue
				}

				switch capability {
				case string(AccountCapabilityLogin):
					account.Capabilities = append(account.Capabilities, AccountCapabilityLogin)
				case string(AccountCapabilityApiKey):
					account.Capabilities = append(account.Capabilities, AccountCapabilityApiKey)
				default:
					// log.Warnf("not supported account capability '%s' in config map key '%s'", capability, key)
				}
			}
		case accountEnabledSuffix:
			account.Enabled, err = strconv.ParseBool(val)
			if err != nil {
				return nil, err
			}
		}
		accounts[accountName] = account
	}

	for name, account := range accounts {
		if passwordHash, ok := secret.Data[fmt.Sprintf("%s.%s", name, accountPasswordSuffix)]; ok {
			account.PasswordHash = string(passwordHash)
		}
		if passwordMtime, ok := secret.Data[fmt.Sprintf("%s.%s", name, accountPasswordMtimeSuffix)]; ok {
			if mTime, err := time.Parse(time.RFC3339, string(passwordMtime)); err != nil {
				return nil, err
			} else {
				account.PasswordMtime = &mTime
			}
		}
		if tokensStr, ok := secret.Data[fmt.Sprintf("%s.%s", name, accountTokensSuffix)]; ok {
			account.Tokens = make([]Token, 0)
			if string(tokensStr) != "" {
				if err := json.Unmarshal(tokensStr, &account.Tokens); err != nil {
					// log.Errorf("Account '%s' has invalid token in secret '%s'", name, secret.Name)
				}
			}
		}
		accounts[name] = account
	}

	return accounts, nil
}
