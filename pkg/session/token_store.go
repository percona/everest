package session

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
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
		return nil, fmt.Errorf("failed to get secret: %w", err)
	}
	var createErr error
	_, createErr = kubeClient.CreateSecret(ctx, blockListSecretTemplate(""))
	if createErr != nil {
		return nil, fmt.Errorf("failed to create secret: %w", createErr)
	}
	return store, nil
}

type tokenStore struct {
	kubeClient kubernetes.KubernetesConnector
	l          *zap.SugaredLogger
	mutex      sync.Mutex
}

func (ts *tokenStore) Add(ctx context.Context, shortenedToken string) error {
	ts.mutex.Lock()
	defer ts.mutex.Unlock()

	secret, err := ts.kubeClient.GetSecret(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestBlocklistSecretName})
	if err != nil {
		ts.l.Errorf("failed to get %s secret: %v", common.EverestBlocklistSecretName, err)
		return err
	}

	addDataToSecret(ts.l, secret, shortenedToken, time.Now().UTC())
	_, updateErr := ts.kubeClient.UpdateSecret(ctx, secret)
	if updateErr != nil {
		ts.l.Errorf("failed to update %s secret, retrying: %v", common.EverestBlocklistSecretName, updateErr)
		return err
	}
	return nil
}

func (ts *tokenStore) Exists(ctx context.Context, shortenedToken string) (bool, error) {
	// no worries about k8s requests overhead - the controller-runtime cache is enabled for Everest API server
	secret, err := ts.kubeClient.GetSecret(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestBlocklistSecretName})
	if err != nil {
		ts.l.Errorf("failed to get %s secret: %v", common.EverestBlocklistSecretName, err)
		return false, err
	}
	list, ok := secret.Data[dataKey]
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
