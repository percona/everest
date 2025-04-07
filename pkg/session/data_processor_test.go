package session

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"

	"github.com/percona/everest/pkg/logger"
)

func TestCleanupOld(t *testing.T) {
	type tcase struct {
		name          string
		data          string
		thresholdDate time.Time
		expected      string
	}
	logger := logger.MustInitLogger(true, "everest")
	l := logger.Sugar()
	tcases := []tcase{
		{
			name:          "one outdated",
			data:          "id123AAA1743687192,id2323BBB1743687194",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      "id2323BBB1743687194",
		},
		{
			name:          "two outdated",
			data:          "id123AAA1743687192,id2323BBB1743687193,id2323BBB1743687194",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      "id2323BBB1743687194",
		},
		{
			name:          "all outdated",
			data:          "id123AAA1743687191,id2323BBB1743687192,id2323BBB1743687193",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      "",
		},
		{
			name:          "all fresh",
			data:          "id123AAA1743687194,id2323BBB1743687195,id2323BBB1743687196",
			thresholdDate: time.Date(2025, 4, 3, 13, 33, 13, 0, time.UTC),
			expected:      "id123AAA1743687194,id2323BBB1743687195,id2323BBB1743687196",
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
			name:          "no data in secret",
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
				Data: map[string][]byte{
					dataKey: []byte("id123AAA1743687191,id123AAA1743687193"),
				},
				StringData: map[string]string{
					dataKey: "id123AAA1743687193,id123AAA1743687194",
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
