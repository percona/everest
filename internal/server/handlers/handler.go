package handlers

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

// Handler provides an abstraction for the core business logic of the Everest API.
// Each implementation of a handler is responsible for handling a specific set of operations (e.g, request validation, RBAC, KubeAPI, etc.).
// Handlers may be chained together using the SetNext() method to form a chain of responsibility.
// Each Handler implementation is individually responsible for calling the next handler in the chain.
type Handler interface {
	// SetNext sets the next handler to call in the chain.
	SetNext(h Handler)

	DatabaseClusterHandler
	DatabaseClusterBackupHandler
	DatabaseClusterRestoreHandler
	DatabaseEngineHandler
	BackupStorageHandler
	MonitoringInstanceHandler

	GetKubernetesClusterInfo(ctx context.Context, user string) (*api.KubernetesClusterInfo, error)
	GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error)
}

// DatabaseClusterHandler provides methods for handling operations on database clusters.
type DatabaseClusterHandler interface {
	CreateDatabaseCluster(ctx context.Context, user string, req *everestv1alpha1.DatabaseCluster) error
	ListDatabaseClusters(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterList, error)
	DeleteDatabaseCluster(ctx context.Context, user, namespace, name string, delReq *api.DeleteDatabaseClusterParams) error
	UpdateDatabaseCluster(ctx context.Context, user string, req *everestv1alpha1.DatabaseCluster) error
	GetDatabaseCluster(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseCluster, error)
	GetDatabaseClusterCredentials(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterCredential, error)
	GetDatabaseClusterComponents(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterComponents, error)
	GetDatabaseClusterPitr(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterPitr, error)
}

// DatabaseClusterBackupHandler provides methods for handling operations on database cluster backups.
type DatabaseClusterBackupHandler interface {
	GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error)
	ListDatabaseClusterBackups(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterBackupList, error)
	CreateDatabaseClusterBackup(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterBackup) error
	DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string) error
}

// DatabaseClusterRestoreHandler provides methods for handling operations on database cluster restores.
type DatabaseClusterRestoreHandler interface {
	GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error)
	ListDatabaseClusterRestores(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterRestoreList, error)
	CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error
	DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error
	UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error
}

// DatabaseEngineHandler provides methods for handling operations on database engines.
type DatabaseEngineHandler interface {
	ListDatabaseEngines(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseEngineList, error)
	GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseEngine, error)
	UpdateDatabaseEngine(ctx context.Context, user string, req *everestv1alpha1.DatabaseEngine) error
	GetUpgradePlan(ctx context.Context, user, namespace, name string) (*api.UpgradePlan, error)
	ApproveUpgradePlan(ctx context.Context, user, namespace string) error
}

// BackupStorageHandler provides methods for handling operations on backup storages.
type BackupStorageHandler interface {
	ListBackupStorages(ctx context.Context, user, namespace string) (*everestv1alpha1.BackupStorageList, error)
	GetBackupStorage(ctx context.Context, user, namespace, name string) (*everestv1alpha1.BackupStorage, error)
	CreateBackupStorage(ctx context.Context, user string, req *everestv1alpha1.BackupStorage) error
	UpdateBackupStorage(ctx context.Context, user string, req *everestv1alpha1.BackupStorage) error
	DeleteBackupStorage(ctx context.Context, user, namespace, name string) error
}

// MonitoringInstanceHandler provides methods for handling operations on monitoring instances.
type MonitoringInstanceHandler interface {
	CreateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error
	ListMonitoringInstances(ctx context.Context, user, namespaces string) (*everestv1alpha1.MonitoringConfigList, error)
	GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*everestv1alpha1.MonitoringConfig, error)
	UpdateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error
	DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error
}
