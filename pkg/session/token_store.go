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
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	sep          = ","
	timestampLen = 10
)

func newTokenStore(ctx context.Context, kubeClient kubernetes.KubernetesConnector, logger *zap.SugaredLogger) (TokenStore, error) {
	store := &tokenStore{
		l:          logger,
		kubeClient: kubeClient,
	}
	_, err := kubeClient.GetSecret(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestBlocklistSecretName})
	if err == nil {
		return store, nil
	}
	if !k8serrors.IsNotFound(err) {
		return nil, fmt.Errorf("failed to get %s secret in the %s namespace: %w", common.EverestBlocklistSecretName, common.SystemNamespace, err)
	}
	var createErr error
	secret := getBlockListSecretTemplate("")
	_, createErr = kubeClient.CreateSecret(ctx, secret)
	if createErr != nil {
		return nil, fmt.Errorf("failed to create secret %s in namespace %s: %w", secret.Name, secret.Namespace, createErr)
	}
	return store, nil
}

type tokenStore struct {
	kubeClient kubernetes.KubernetesConnector
	l          *zap.SugaredLogger
	secret     *corev1.Secret
}

// Add adds the shortened token to the blocklist
func (ts *tokenStore) Add(ctx context.Context, shortenedToken string) error {
	secret, err := ts.kubeClient.GetSecret(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestBlocklistSecretName})
	if err != nil {
		ts.l.Errorf("failed to get %s secret in the %s namespace: %v", common.EverestBlocklistSecretName, common.SystemNamespace, err)
		return err
	}

	secret = addDataToSecret(ts.l, secret, shortenedToken, time.Now().UTC())
	updatedSecret, updateErr := ts.kubeClient.UpdateSecret(ctx, secret)
	if updateErr != nil {
		ts.l.Errorf("failed to update %s secret in the %s namespace, retrying: %v", secret.Name, secret.Namespace, updateErr)
		return err
	}
	ts.secret = updatedSecret
	return nil
}

// Exists checks if the shortened token is in the blocklist
func (ts *tokenStore) Exists(ctx context.Context, shortenedToken string) (bool, error) {
	if ts.secret == nil {
		secret, err := ts.kubeClient.GetSecret(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestBlocklistSecretName})
		if err != nil {
			ts.l.Errorf("failed to get %s secret in the %s namespace: %v", common.EverestBlocklistSecretName, common.SystemNamespace, err)
			return false, err
		}
		ts.secret = secret
	}
	list, ok := ts.secret.Data[dataKey]
	return ok && strings.Contains(string(list), shortenedToken), nil
}

func addDataToSecret(l *zap.SugaredLogger, secret *corev1.Secret, shortenedToken string, now time.Time) *corev1.Secret {
	existingList, ok := secret.Data[dataKey]
	if !ok {
		secret.StringData = map[string]string{
			dataKey: shortenedToken,
		}
		return secret
	}
	list := append(cleanupOld(l, string(existingList), now), shortenedToken)
	secret.StringData = map[string]string{
		dataKey: strings.Join(list, sep),
	}
	return secret
}

func cleanupOld(l *zap.SugaredLogger, list string, now time.Time) []string {
	tokens := strings.Split(list, sep)
	newList := make([]string, 0, len(tokens))
	for _, shortenedToken := range tokens {
		length := len(shortenedToken)
		if length < timestampLen {
			l.Info("blocklist contains irregular data format")
			continue
		}
		ts := shortenedToken[length-10 : length]
		tsInt, err := strconv.ParseInt(ts, 10, 64)
		if err != nil {
			l.Infof("failed to parse timestamp %v", tsInt)
			continue
		}
		timeObj := time.Unix(tsInt, 0)
		// only keep the tokens which natural expiration time is not over yet
		if timeObj.After(now) {
			newList = append(newList, shortenedToken)
		}
	}
	return newList
}

func getBlockListSecretTemplate(stringData string) *corev1.Secret {
	return &corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Secret",
			APIVersion: "v1",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestBlocklistSecretName,
			Namespace: common.SystemNamespace,
		},
		StringData: map[string]string{
			dataKey: stringData,
		},
	}
}
