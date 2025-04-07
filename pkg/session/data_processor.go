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

type content struct {
	mutex sync.Mutex
}

func newDataProcessor() Content {
	return &content{}
}

func (d *content) Add(l *zap.SugaredLogger, secret *corev1.Secret, tokenData string) (*corev1.Secret, bool) {
	if d.mutex.TryLock() {
		defer d.mutex.Unlock()
		return addDataToSecret(l, secret, tokenData, time.Now().UTC()), false
	}
	return secret, true
}

func (d *content) IsIn(secret *corev1.Secret, tokenData string) bool {
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
	// the timestamps are naturally sorted from old to new when being added to the list.
	// so to clean up the old records we cut string from the beginning and check if the timestamp of each piece
	// is younger than the threshold. Once we hit a younger token we stop cutting and return the rest.
	for len(list) > 0 {
		shrunkToken, newList, ok := strings.Cut(list, sep)
		if !ok {
			// the last shrunktoken ????
		}
		length := len(shrunkToken)
		if length < timestampLen {
			l.Info("blocklist contains irregular data format")
			continue
		}
		ts := shrunkToken[length-10 : length]
		tsInt, err := strconv.ParseInt(ts, 10, 64)
		if err != nil {
			l.Infof("failed to parse timestamp %v", tsInt)
			continue
		}
		timeObj := time.Unix(tsInt, 0)
		if timeObj.After(thresholdDate) {
			return list
		}
		list = newList
	}
	return list
}
