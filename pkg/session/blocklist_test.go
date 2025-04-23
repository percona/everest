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

package session

import (
	"context"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	fakeclient "sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func TestBlocklist_Block(t *testing.T) {
	objs := []ctrlclient.Object{
		getBlockListSecretTemplate(""),
	}

	mockClient := fakeclient.NewClientBuilder().WithScheme(kubernetes.CreateScheme())
	mockClient.WithObjects(objs...)
	l := zap.NewNop().Sugar()
	k := kubernetes.NewEmpty(l).WithKubernetesClient(mockClient.Build())
	ctx := context.WithValue(
		context.Background(),
		common.UserCtxKey,
		jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a", "exp": float64(331743679478)}),
	)

	b, err := NewBlocklist(ctx, k, l)
	assert.NoError(t, err)

	err = b.Block(ctx)
	assert.NoError(t, err)

	secret, err := k.GetSecret(ctx, ctrlclient.ObjectKey{
		Name:      common.EverestBlocklistSecretName,
		Namespace: common.SystemNamespace,
	})
	assert.NoError(t, err)
	// the mocked client does not do this StringData -> Data transformation in Secrets which the actual k8a API do, so
	// we only check the StringData field
	assert.Equal(t, "9d1c1f98-a479-41e3-8939-c7cb3e049a331743679478", secret.StringData[dataKey])
}

func TestBlocklist_IsBlocked(t *testing.T) {
	secret := getBlockListSecretTemplate("the-blocked-jti331743679478")
	// when writing Secrets, the mocked client does not do this StringData -> Data transformation which the actual k8a API do,
	// so we need to set the Data field manually
	secret.Data = map[string][]byte{dataKey: []byte("the-blocked-jti331743679478")}

	objs := []ctrlclient.Object{secret}

	mockClient := fakeclient.NewClientBuilder().WithScheme(kubernetes.CreateScheme())
	mockClient.WithObjects(objs...)
	l := zap.NewNop().Sugar()
	k := kubernetes.NewEmpty(l).WithKubernetesClient(mockClient.Build())

	t.Run("blocked token in context", func(t *testing.T) {
		ctx := context.WithValue(
			context.Background(),
			common.UserCtxKey,
			jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "the-blocked-jti", "exp": float64(331743679478)}),
		)

		b, err := NewBlocklist(ctx, k, l)
		assert.NoError(t, err)

		blocked, err := b.IsBlocked(ctx)
		assert.NoError(t, err)
		assert.True(t, blocked)

	})

	t.Run("not blocked token in context", func(t *testing.T) {
		ctx := context.WithValue(
			context.Background(),
			common.UserCtxKey,
			jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "some-other-jti", "exp": float64(331743679478)}),
		)

		b, err := NewBlocklist(ctx, k, l)
		assert.NoError(t, err)

		blocked, err := b.IsBlocked(ctx)
		assert.NoError(t, err)
		assert.False(t, blocked)
	})

}
