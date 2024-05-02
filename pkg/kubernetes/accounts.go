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

// Package client ...
package kubernetes

import (
	"context"

	"github.com/percona/everest/pkg/kubernetes/client/accounts"
)

// Accounts provides an interface for managing Everest user accounts.
type Accounts interface {
	Create(ctx context.Context, username, password string) error
	Get(ctx context.Context, username string) (*accounts.Account, error)
	List(ctx context.Context) ([]accounts.Account, error)
	Delete(ctx context.Context, username string) error
	Update(ctx context.Context, username, password string) error
}

// Accounts returns a new client for managing everest user accounts.
func (c *Kubernetes) Accounts(ctx context.Context) Accounts {
	return accounts.New(c.client)
}
