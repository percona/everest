// everest
// Copyright (C) 2025 Percona LLC
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

package kubernetes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

func TestAccounts(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	c := client.NewFromFakeClient()

	// Create system namespace for testing.
	_, err := c.Clientset().
		CoreV1().
		Namespaces().
		Create(ctx, &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{Name: common.SystemNamespace},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)

	// Prepare secret.
	_, err = c.Clientset().
		CoreV1().
		Secrets(common.SystemNamespace).
		Create(ctx, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestAccountsSecretName,
				Namespace: common.SystemNamespace,
			},
		}, metav1.CreateOptions{},
		)
	require.NoError(t, err)

	accounts.Tests(t, New(c))
}
