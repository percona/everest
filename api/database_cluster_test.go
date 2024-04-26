package api

import (
	"testing"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/require"
)

func TestLatestRestorableDate(t *testing.T) {
	t.Parallel()
	type tCase struct {
		uploadInterval   int
		latestBackupTime time.Time
		now              time.Time
		expected         *time.Time
		name             string
	}

	now := time.Date(2024, 3, 12, 12, 0, 0, 0, time.UTC)
	cases := []tCase{
		{
			name:             "backup 5 min ago, upload interval 10 min",
			uploadInterval:   600,
			latestBackupTime: now.Add(-300 * time.Second),
			now:              now,
			expected:         nil,
		},
		{
			name:             "backup 15 min ago, upload interval 10 min",
			uploadInterval:   600,
			latestBackupTime: now.Add(-900 * time.Second),
			now:              now,
			expected:         pointer.ToTime(now.Add(-600 * time.Second)),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.expected, latestRestorableDate(tc.now, tc.latestBackupTime, tc.uploadInterval))
		})
	}
}
