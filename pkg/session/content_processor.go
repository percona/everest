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
	// expiration   = time.Hour * 24
	expiration = time.Second * 30
)

type contentProcessor struct {
	mutex sync.Mutex
}

func newContentProcessor() ContentProcessor {
	return &contentProcessor{}
}

func (d *contentProcessor) Add(l *zap.SugaredLogger, secret *corev1.Secret, tokenData string) (*corev1.Secret, bool) {
	if d.mutex.TryLock() {
		defer d.mutex.Unlock()
		return addDataToSecret(l, secret, tokenData, time.Now().Add(-expiration).UTC()), false
	}
	return secret, true
}

func (d *contentProcessor) IsBlocked(secret *corev1.Secret, tokenData string) bool {
	list, ok := secret.Data[dataKey]
	return ok && strings.Contains(string(list), tokenData)
}

func addDataToSecret(l *zap.SugaredLogger, secret *corev1.Secret, newData string, thresholdDate time.Time) *corev1.Secret {
	byteArr, ok := secret.Data[dataKey]
	if !ok {
		secret.StringData = map[string]string{
			dataKey: newData,
		}
		return secret
	}
	list := string(byteArr)
	list = cleanupOld(l, list, thresholdDate)
	list += sep + newData
	secret.StringData = map[string]string{
		dataKey: list,
	}
	return secret
}

func cleanupOld(l *zap.SugaredLogger, list string, thresholdDate time.Time) string {
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
		l.Info("time", "from token: ", timeObj, "treshold: ", thresholdDate)
		// only keep the tokens which natural expiration time is not over yet
		if timeObj.After(thresholdDate) {
			newList = append(newList, shortenedToken)
		}
	}
	return strings.Join(newList, sep)
}
