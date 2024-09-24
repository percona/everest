package api

import (
	"context"
	"testing"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/client"
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
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "2.3.1"},
			interval: nil,
			expected: pgDefaultUploadInterval,
		},
		{
			name:     "old pg, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "2.3.1"},
			interval: pointer.ToInt(1000),
			expected: 1000,
		},
		{
			name:     "new pg, no interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "2.4.0"},
			interval: nil,
			expected: 0,
		},
		{
			name:     "new pg, interval is set",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "2.4.0"},
			interval: pointer.ToInt(1000),
			expected: 0,
		},
		{
			name:     "newer pg",
			engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql, Version: "2.4.1"},
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

func TestConnectionURL(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name    string
		podList corev1.PodList
		db      everestv1alpha1.DatabaseCluster
		user,
		password,
		expected string
	}

	cases := []testCase{
		{
			name: "non-sharded psmdb 1 node",
			podList: corev1.PodList{Items: []corev1.Pod{
				{Spec: corev1.PodSpec{Hostname: "mongodb-try-rs0-0"}},
			}},
			db: everestv1alpha1.DatabaseCluster{
				Spec:   everestv1alpha1.DatabaseClusterSpec{Engine: everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB}},
				Status: everestv1alpha1.DatabaseClusterStatus{Hostname: "mongodb-56u-rs0.my-special-place.svc.cluster.local", Port: 27017},
			},
			user:     "databaseAdmin",
			password: "dlfkdfo$%al",
			expected: "mongodb://databaseAdmin:dlfkdfo%2524%2525al@mongodb-try-rs0-0.mongodb-56u-rs0.my-special-place.svc.cluster.local:27017",
		},
		{
			name: "non-sharded psmdb 3 node",
			podList: corev1.PodList{Items: []corev1.Pod{
				{Spec: corev1.PodSpec{Hostname: "mongodb-try-rs0-0"}},
				{Spec: corev1.PodSpec{Hostname: "mongodb-try-rs0-1"}},
				{Spec: corev1.PodSpec{Hostname: "mongodb-try-rs0-2"}},
			}},
			db: everestv1alpha1.DatabaseCluster{
				Spec:   everestv1alpha1.DatabaseClusterSpec{Engine: everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB}},
				Status: everestv1alpha1.DatabaseClusterStatus{Hostname: "mongodb-56u-rs0.my-special-place.svc.cluster.local", Port: 27017},
			},
			user:     "databaseAdmin",
			password: "dlfkdfo$%al",
			expected: "mongodb://databaseAdmin:dlfkdfo%2524%2525al@mongodb-try-rs0-0.mongodb-56u-rs0.my-special-place.svc.cluster.local:27017,mongodb-try-rs0-1.mongodb-56u-rs0.my-special-place.svc.cluster.local:27017,mongodb-try-rs0-2.mongodb-56u-rs0.my-special-place.svc.cluster.local:27017",
		},
		{
			name:    "sharded psmdb",
			podList: corev1.PodList{Items: []corev1.Pod{}},
			db: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine:   everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePSMDB},
					Sharding: &everestv1alpha1.Sharding{Enabled: true},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{Hostname: "mongodb-56u-mongos.my-special-place.svc.cluster.local", Port: 27017},
			},
			user:     "databaseAdmin",
			password: "dlfkdfo$%al",
			expected: "mongodb://databaseAdmin:dlfkdfo%2524%2525al@mongodb-56u-mongos.my-special-place.svc.cluster.local:27017",
		},
		{
			name:    "pg",
			podList: corev1.PodList{Items: []corev1.Pod{}},
			db: everestv1alpha1.DatabaseCluster{
				Spec:   everestv1alpha1.DatabaseClusterSpec{Engine: everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePostgresql}},
				Status: everestv1alpha1.DatabaseClusterStatus{Hostname: "postgresql-a5d-pgbouncer.everest.svc", Port: 5432},
			},
			user:     "postgres",
			password: "55aBDedMF;So|C?^3x|h.dDC",
			expected: "postgres://postgres:55aBDedMF%253BSo%257CC%253F%255E3x%257Ch.dDC@postgresql-a5d-pgbouncer.everest.svc:5432",
		},
		{
			name:    "pxc",
			podList: corev1.PodList{Items: []corev1.Pod{}},
			db: everestv1alpha1.DatabaseCluster{
				Spec:   everestv1alpha1.DatabaseClusterSpec{Engine: everestv1alpha1.Engine{Type: everestv1alpha1.DatabaseEnginePXC}},
				Status: everestv1alpha1.DatabaseClusterStatus{Hostname: "mysql-29o-haproxy.everest", Port: 3306},
			},
			user:     "root",
			password: ",0#3PdCIc=9CS(do2",
			expected: "jdbc:mysql://root:%252C0%25233PdCIc%253D9CS%2528do2@mysql-29o-haproxy.everest:3306",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			k := &kubernetes.Kubernetes{}
			mockConnector := &client.MockKubeClientConnector{}
			mockConnector.On("GetPods", mock.Anything, mock.Anything, mock.Anything).
				Return(&tc.podList, nil)
			k.WithClient(mockConnector)
			e := EverestServer{
				kubeClient: k,
			}
			url := e.connectionURL(context.Background(), &tc.db, tc.user, tc.password)
			require.Equal(t, tc.expected, *url)
		})
	}
}
