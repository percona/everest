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
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	fakeclient "sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func TestShortenToken(t *testing.T) {
	type tcase struct {
		name           string
		claims         jwt.MapClaims
		shortenedToken string
		error          error
	}
	tcases := []tcase{
		{
			name: "valid",
			claims: jwt.MapClaims{
				"jti": "9d1c1f98-a479-41e3-8939-c7cb3edefa",
				"exp": float64(331743679478),
			},
			shortenedToken: "9d1c1f98-a479-41e3-8939-c7cb3edefa331743679478",
			error:          nil,
		},
		{
			name: "no jti",
			claims: jwt.MapClaims{
				"exp": float64(331743679478),
			},
			shortenedToken: "",
			error:          errExtractJti,
		},
		{
			name: "no exp",
			claims: jwt.MapClaims{
				"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a",
			},
			shortenedToken: "",
			error:          errExtractExp,
		},
	}
	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result, err := shortenToken(jwt.NewWithClaims(jwt.SigningMethodHS256, tc.claims))
			assert.Equal(t, tc.error, err)
			assert.Equal(t, tc.shortenedToken, result)
		})
	}
}

func TestExtractContent(t *testing.T) {
	type tcase struct {
		name   string
		token  *jwt.Token
		error  error
		result *JWTContent
	}
	tokenUnsupportedClaims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{})
	tcases := []tcase{
		{
			name:   "empty token",
			token:  nil,
			result: nil,
			error:  errEmptyToken,
		},
		{
			name:   "unsupported claims",
			token:  tokenUnsupportedClaims,
			result: nil,
			error:  errUnsupportedClaim(tokenUnsupportedClaims.Claims),
		},
		{
			name:  "valid empty payload",
			token: jwt.New(jwt.SigningMethodHS256),
			result: &JWTContent{
				Payload: make(map[string]interface{}),
			},
			error: nil,
		},
		{
			name:  "valid with payload",
			token: jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a", "exp": float64(331743679478)}),
			result: &JWTContent{
				Payload: map[string]interface{}{"exp": float64(331743679478), "jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a"},
			},
			error: nil,
		},
	}
	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result, err := extractContent(tc.token)
			assert.Equal(t, tc.error, err)
			assert.Equal(t, tc.result, result)
		})
	}
}

func TestBlocklist_Block(t *testing.T) {
	mockClient := fakeclient.NewClientBuilder().WithScheme(kubernetes.CreateScheme())
	l := zap.NewNop().Sugar()
	k := kubernetes.NewEmpty(l).WithKubernetesClient(mockClient.Build())

	ctx := context.Background()
	jwt := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "9d1c1f98-a479-41e3-8939-c7cb3e049a", "exp": float64(331743679478)})

	// check there is no blocklist secret before the blocklist creation
	secret, err := k.GetSecret(ctx, ctrlclient.ObjectKey{
		Name:      common.EverestBlocklistSecretName,
		Namespace: common.SystemNamespace,
	})
	assert.True(t, k8serrors.IsNotFound(err))
	assert.Nil(t, secret)

	b, err := mockNewBlocklist(ctx, l, k)
	assert.NoError(t, err)

	// blocklist secret appears after the blocklist creation
	secret, err = k.GetSecret(ctx, ctrlclient.ObjectKey{
		Name:      common.EverestBlocklistSecretName,
		Namespace: common.SystemNamespace,
	})
	assert.NoError(t, err)
	assert.NotNil(t, secret)
	assert.Equal(t, "", secret.StringData[dataKey])

	// block the token from the context and check the secret has been changed accordingly
	err = b.Block(ctx, jwt)
	assert.NoError(t, err)

	secret, err = k.GetSecret(ctx, ctrlclient.ObjectKey{
		Name:      common.EverestBlocklistSecretName,
		Namespace: common.SystemNamespace,
	})
	assert.NoError(t, err)
	// the mocked client does not do this StringData -> Data transformation in Secrets which the actual k8a API do, so
	// we only check the StringData field
	assert.Equal(t, "9d1c1f98-a479-41e3-8939-c7cb3e049a331743679478", secret.StringData[dataKey])

	// deleting secret to test the backoff
	err = k.DeleteSecret(ctx, secret)
	assert.NoError(t, err)

	// after deleting secret - try to block again, get the NotFound error
	err = b.Block(ctx, jwt)
	assert.Equal(t, true, k8serrors.IsNotFound(err))
}

func TestBlocklist_IsBlocked(t *testing.T) {
	secret := getBlockListSecretTemplate("the-blocked-jti331743679478")
	// when writing Secrets, the mocked client does not do this StringData -> Data transformation which the actual k8a API do,
	// so we set the Data field manually
	secret.Data = map[string][]byte{dataKey: []byte("the-blocked-jti331743679478")}
	objs := []ctrlclient.Object{secret}

	mockClient := fakeclient.NewClientBuilder().WithScheme(kubernetes.CreateScheme())
	mockClient.WithObjects(objs...)
	l := zap.NewNop().Sugar()
	k := kubernetes.NewEmpty(l).WithKubernetesClient(mockClient.Build())

	t.Run("blocked token in context", func(t *testing.T) {
		ctx := context.Background()
		jwt := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "the-blocked-jti", "exp": float64(331743679478)})

		b, err := mockNewBlocklist(ctx, l, k)
		assert.NoError(t, err)

		blocked, err := b.IsBlocked(ctx, jwt)
		assert.NoError(t, err)
		assert.True(t, blocked)
	})

	t.Run("not blocked token in context", func(t *testing.T) {
		ctx := context.Background()

		b, err := mockNewBlocklist(ctx, l, k)
		assert.NoError(t, err)

		jwt := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"jti": "some-other-jti", "exp": float64(331743679478)})
		blocked, err := b.IsBlocked(ctx, jwt)
		assert.NoError(t, err)
		assert.False(t, blocked)
	})
}

func mockNewBlocklist(ctx context.Context, logger *zap.SugaredLogger, mockClient TokenStoreClient) (Blocklist, error) {
	store, err := newTokenStore(ctx, mockClient, logger)
	if err != nil {
		return nil, err
	}
	return &blocklist{
		tokenStore: store,
		l:          logger,
	}, nil
}
