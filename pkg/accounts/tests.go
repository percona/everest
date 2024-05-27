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

package accounts

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Tests runs a series of tests on the provided accounts provider.
func Tests(t *testing.T, p Interface) {
	ctx := context.Background()
	// Check that there are currently no accounts.
	accounts, err := p.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, accounts)

	// Create a new account.
	err = p.Create(ctx, "user1", "password1")
	require.NoError(t, err)

	// Get user1.
	user1, err := p.Get(ctx, "user1")
	require.NoError(t, err)
	assert.NotNil(t, user1)
	assert.True(t, user1.Enabled)

	// List accounts.
	accounts, err = p.List(ctx)
	require.NoError(t, err)
	assert.Len(t, accounts, 1)

	// Verify user1.
	err = p.Verify(ctx, "user1", "password1")
	require.NoError(t, err)

	// Update password for user1.
	err = p.SetPassword(ctx, "user1", "updated-password1", true)
	require.NoError(t, err)
	// Verify updated password.
	err = p.Verify(ctx, "user1", "updated-password1")
	require.NoError(t, err)

	// Delete user1.
	err = p.Delete(ctx, "user1")
	require.NoError(t, err)

	// Check that no accounts exist.
	accounts, err = p.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, accounts)
}
