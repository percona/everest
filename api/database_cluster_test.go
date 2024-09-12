package api

import (
	"testing"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/require"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
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

func TestGetDefaultUploadInterval(t *testing.T) {
	t.Parallel()
	type tCase struct {
		name     string
		engine   everestv1alpha1.Engine
		interval *int
		expected int
	}
	cases := []tCase{
		{
			name:     "old pxc, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC, Version: "1.13.0"},
			interval: nil,
			expected: pxcDefaultUploadInterval,
		},
		{
			name:     "old pxc, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC, Version: "1.13.0"},
			interval: pointer.ToInt(1000),
			expected: 1000,
		},
		{
			name:     "new pxc, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC, Version: "1.14.0"},
			interval: nil,
			expected: 0,
		},
		{
			name:     "new pxc, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC, Version: "1.14.0"},
			interval: pointer.ToInt(1000),
			expected: 0,
		},
		{
			name:     "newer pxc",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC, Version: "1.15.1"},
			interval: nil,
			expected: 0,
		},
		{
			name:     "old psmdb, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB, Version: "1.15.0"},
			interval: nil,
			expected: psmdbDefaultUploadInterval,
		},
		{
			name:     "old psmdb, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB, Version: "1.15.0"},
			interval: pointer.ToInt(1000),
			expected: 1000,
		},
		{
			name:     "new psmdb, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB, Version: "1.16.0"},
			interval: nil,
			expected: 0,
		},
		{
			name:     "new psmdb, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB, Version: "1.16.0"},
			interval: pointer.ToInt(1000),
			expected: 0,
		},
		{
			name:     "newer psmdb",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB, Version: "1.16.1"},
			interval: nil,
			expected: 0,
		},

		{
			name:     "old pg, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "1.3.1"},
			interval: nil,
			expected: pgDefaultUploadInterval,
		},
		{
			name:     "old pg, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "1.3.1"},
			interval: pointer.ToInt(1000),
			expected: 1000,
		},
		{
			name:     "new pg, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "1.4.0"},
			interval: nil,
			expected: 0,
		},
		{
			name:     "new pg, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "1.4.0"},
			interval: pointer.ToInt(1000),
			expected: 0,
		},
		{
			name:     "newer pg",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "1.4.1"},
			interval: nil,
			expected: 0,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.expected, getDefaultUploadInterval(tc.engine, tc.interval))
		})
	}
}
