package api

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest-operator/api/v1alpha1"
)

func TestIntoCR(t *testing.T) {
	raw := `
{
    "apiVersion": "v1alpha1",
    "kind": "DatabaseCluster",
    "metadata": {
        "name": "test-db",
        "namespace": "everest"
    },
    "spec": {
        "allowUnsafeConfiguration": true,
        "backup": {
            "enabled": true,
            "pitr": {
                "backupStorageName": "default-backup-storage",
                "enabled": true,
                "uploadIntervalSec": 300
            },
            "schedules": [
                {
                    "backupStorageName": "default-backup-storage",
                    "enabled": true,
                    "name": "daily-backup",
                    "retentionCopies": 7,
                    "schedule": "0 2 * * *"
                }
            ]
        },
        "dataSource": {
            "backupSource": {
                "backupStorageName": "default-backup-storage",
                "path": "/backups/cluster-backup"
            },
            "dbClusterBackupName": "previous-cluster-backup",
            "pitr": {
                "date": "2024-12-01T12:00:00Z",
                "type": "FULL"
            }
        },
        "engine": {
            "config": "{}",
            "crVersion": "1.2.0",
            "replicas": 3,
            "storage": {
                "class": "standard",
                "size": "100Gi"
            },
            "type": "MySQL",
            "userSecretsName": "db-secrets",
            "version": "8.0.32"
        }
    }
}
    `
	in := &DatabaseCluster{}
	err := json.Unmarshal([]byte(raw), in)
	require.NoError(t, err)

	out, err := IntoCR[v1alpha1.DatabaseCluster](in)
	require.NoError(t, err)
	assert.NotNil(t, out)

	assert.Equal(t, "test-db", out.GetName())
	assert.Equal(t, "everest", out.GetNamespace())
	assert.True(t, out.Spec.AllowUnsafeConfiguration)

	assert.True(t, out.Spec.Backup.Enabled)
	assert.Equal(t, "default-backup-storage", *out.Spec.Backup.PITR.BackupStorageName)
	assert.True(t, out.Spec.Backup.PITR.Enabled)
	assert.Equal(t, 300, *out.Spec.Backup.PITR.UploadIntervalSec)
	assert.Equal(t, "default-backup-storage", out.Spec.Backup.Schedules[0].BackupStorageName)
	assert.True(t, out.Spec.Backup.Schedules[0].Enabled)
	assert.Equal(t, "daily-backup", out.Spec.Backup.Schedules[0].Name)
	assert.Equal(t, int32(7), out.Spec.Backup.Schedules[0].RetentionCopies)
	assert.Equal(t, "0 2 * * *", out.Spec.Backup.Schedules[0].Schedule)
	assert.Len(t, out.Spec.Backup.Schedules, 1)
	assert.Equal(t, "default-backup-storage", out.Spec.DataSource.BackupSource.BackupStorageName)
	assert.Equal(t, "/backups/cluster-backup", out.Spec.DataSource.BackupSource.Path)
	assert.Equal(t, "previous-cluster-backup", out.Spec.DataSource.DBClusterBackupName)
	restoreTime := v1alpha1.RestoreDate{Time: v1.Time{Time: time.Date(2024, 12, 1, 12, 0, 0, 0, time.UTC)}}
	assert.Equal(t, restoreTime, *out.Spec.DataSource.PITR.Date)
	assert.Equal(t, v1alpha1.PITRType("FULL"), out.Spec.DataSource.PITR.Type)
}
