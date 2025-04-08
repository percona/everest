package session

import (
	"fmt"
	"go.uber.org/zap/zaptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"

	"github.com/percona/everest/pkg/logger"
)

func TestCleanupOld(t *testing.T) {
	type tcase struct {
		name          string
		data          string
		thresholdDate time.Time
		expected      []string
	}
	logger := logger.MustInitLogger(true, "everest")
	l := logger.Sugar()
	tcases := []tcase{
		{
			name:          "one outdated",
			data:          "id123AAA1743687192,id2323BBB1743687194",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      []string{"id2323BBB1743687194"},
		},
		{
			name:          "two outdated",
			data:          "id123AAA1743687192,id2323BBB1743687193,id2323BBB1743687194",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      []string{"id2323BBB1743687194"},
		},
		{
			name:          "all outdated",
			data:          "id123AAA1743687191,id2323BBB1743687192,id2323BBB1743687193",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      []string{},
		},
		{
			name:          "all fresh",
			data:          "id123AAA1743687194,id2323BBB1743687195,id2323BBB1743687196",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      []string{"id123AAA1743687194", "id2323BBB1743687195", "id2323BBB1743687196"},
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.expected, cleanupOld(l, tc.data, tc.thresholdDate))
		})
	}
}

func TestAddDataToSecret(t *testing.T) {
	type tcase struct {
		name          string
		data          string
		secret        *corev1.Secret
		thresholdDate time.Time
		expected      *corev1.Secret
	}
	logger := logger.MustInitLogger(true, "everest")
	l := logger.Sugar()
	tcases := []tcase{
		{
			name:          "empty secret",
			data:          "id123AAA1743687192",
			secret:        &corev1.Secret{},
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 10, 0, time.UTC),
			expected: &corev1.Secret{
				StringData: map[string]string{
					dataKey: "id123AAA1743687192",
				},
			},
		},
		{
			name: "nothing to delete, add newer data",
			data: "id123AAA1743687192",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191"),
				},
			},
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 10, 0, time.UTC),
			expected: &corev1.Secret{
				// the Data field is updated only when the object is applied to k8s, so for this test
				// only the write-only StringData field is expected to be changed.
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191"),
				},
				StringData: map[string]string{
					dataKey: "id123AAA1743687191,id123AAA1743687192",
				},
			},
		},
		{
			name: "deleted old data, add newer data",
			data: "id123AAA1743687194",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191,id123AAA1743687193"),
				},
			},
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 12, 0, time.UTC),
			expected: &corev1.Secret{
				// the Data field is updated only when the object is applied to k8s, so for this test
				// only the write-only StringData field is expected to be changed.
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191,id123AAA1743687193"),
				},
				StringData: map[string]string{
					dataKey: "id123AAA1743687193,id123AAA1743687194",
				},
			},
		},
		{
			name: "deleted all old data, add newer data",
			data: "id123AAA1743687195",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191,id123AAA1743687193"),
				},
			},
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 14, 0, time.UTC),
			expected: &corev1.Secret{
				// the Data field is updated only when the object is applied to k8s, so for this test
				// only the write-only StringData field is expected to be changed.
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191,id123AAA1743687193"),
				},
				StringData: map[string]string{
					dataKey: "id123AAA1743687195",
				},
			},
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result := addDataToSecret(l, tc.secret, tc.data, tc.thresholdDate)
			assert.Equal(t, tc.expected, result)
		})
	}
}

/*
This benchmark measures how much time does it take to clean up a long lists of tokens.
On an Apple M3 Pro it takes ~0.69 ms to perform a cleanup for a list of 10,000 tokens, which is acceptable.

goos: darwin
goarch: arm64
pkg: github.com/percona/everest/pkg/session
cpu: Apple M3 Pro
BenchmarkCleanupOld
BenchmarkCleanupOld-12    	    1500	    671899 ns/op
*/
func BenchmarkCleanupOld(b *testing.B) {
	numTokens := 10000
	list := generateTestList(numTokens)
	thresholdDate := time.Date(2025, 4, 3, 13, 33, 1, 0, time.UTC)
	l := zap.L().Sugar()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cleanupOld(l, list, thresholdDate)
	}
}

func generateTestList(numTokens int) string {
	var builder strings.Builder
	expDate := time.Date(2070, 4, 3, 13, 33, 1, 0, time.UTC).Unix()
	for i := 0; i < numTokens; i++ {
		// expiration date is year 2070 which is long ahead, so all the tokens should be kept
		builder.WriteString("21669bd9-2374-4dc1-9238-77d5cad01fed" + fmt.Sprintf("%d", expDate))
		if i < numTokens-1 {
			builder.WriteString(sep)
		}
	}
	return builder.String()
}

func TestContentProcessor_Block_ReturnsOriginalSecretWhenLocked(t *testing.T) {
	l := zaptest.NewLogger(t).Sugar()
	secret := &corev1.Secret{}
	shortenedToken := "test-token"
	processor := &contentProcessor{cachedSecret: blockListSecretTemplate("")}

	// Acquire the lock directly to simulate contention
	processor.mutex.Lock()
	defer processor.mutex.Unlock()

	// Call Block while the lock is held
	returnedSecret, locked := processor.Block(l, secret, shortenedToken)

	if locked {
		t.Errorf("Expected Block to return false when the lock is already held, but it returned true.")
	}

	if returnedSecret != secret {
		t.Errorf("Expected Block to return the original secret when the lock is already held, but it returned a different secret.")
	}
}

func TestContentProcessor_Block_ReturnsUpdatedSecretWhenUnlocked(t *testing.T) {
	l := zaptest.NewLogger(t).Sugar()
	secret := &corev1.Secret{}
	shortenedToken := "test-token"
	processor := &contentProcessor{cachedSecret: blockListSecretTemplate("")}

	// Call Block when the lock is free
	returnedSecret, locked := processor.Block(l, secret, shortenedToken)

	if !locked {
		t.Errorf("Expected Block to return true when the lock is free, but it returned false.")
	}

	if returnedSecret == nil {
		t.Errorf("Expected Block to return a non-nil secret, but it returned nil.")
	}
}
