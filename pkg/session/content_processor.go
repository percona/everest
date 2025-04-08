package session

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
)

const (
	sep          = ","
	timestampLen = 10
)

// ContentProcessor knows how to work with actual data in the blocklist.
type ContentProcessor interface {
	// Block adds the token to the blacklist, cleans up the outdated data from the secret.
	// The method returns the updated secret and a bool that indicates if the attempt was successful.
	Block(l *zap.SugaredLogger, secret *corev1.Secret, shortenedToken string) (*corev1.Secret, bool)
	// IsBlocked returns true if the given shortened token is in the blocklist.
	IsBlocked(shortenedToken string) bool
	// UpdateCache updates the cached secret which is used for reading.
	UpdateCache(secret *corev1.Secret)
}

type contentProcessor struct {
	mutex        sync.Mutex
	cachedSecret *corev1.Secret
}

func newContentProcessor(secret *corev1.Secret) ContentProcessor {
	return &contentProcessor{
		cachedSecret: secret,
	}
}

// Block adds the token to the blacklist, cleans up the outdated data from the secret.
// The method returns the updated secret and a bool that indicates if the attempt was successful.
func (d *contentProcessor) Block(l *zap.SugaredLogger, secret *corev1.Secret, shortenedToken string) (*corev1.Secret, bool) {
	if d.mutex.TryLock() {
		defer d.mutex.Unlock()
		updatedSecret := addDataToSecret(l, secret, shortenedToken, time.Now().UTC())
		return updatedSecret, true
	}
	return secret, false
}

// IsBlocked returns true if the given shortened token is in the blocklist.
func (d *contentProcessor) IsBlocked(shortenedToken string) bool {
	if d.cachedSecret == nil {
		return false
	}
	list, ok := d.cachedSecret.Data[dataKey]
	return ok && strings.Contains(string(list), shortenedToken)
}

// UpdateCache updates the cached secret which is used for reading.
func (d *contentProcessor) UpdateCache(secret *corev1.Secret) {
	d.cachedSecret = secret
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
