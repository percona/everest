package handlers

import (
	"context"

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
	CreateDatabaseCluster(ctx context.Context, user string, req *api.DatabaseCluster) error
	ListDatabaseClusters(ctx context.Context, user, namespace string) (*api.DatabaseClusterList, error)
	DeleteDatabaseCluster(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterParams) error
	UpdateDatabaseCluster(ctx context.Context, user string, req *api.DatabaseCluster) error
	GetDatabaseCluster(ctx context.Context, user, namespace, name string) (*api.DatabaseCluster, error)
	GetDatabaseClusterCredentials(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterCredential, error)
	GetDatabaseClusterComponents(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterComponents, error)
	GetDatabaseClusterPitr(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterPitr, error)
}

// DatabaseClusterBackupHandler provides methods for handling operations on database cluster backups.
type DatabaseClusterBackupHandler interface {
	ListDatabaseClusterBackups(ctx context.Context, user, namespace string) (*api.DatabaseClusterBackupList, error)
	CreateDatabaseClusterBackup(ctx context.Context, user, req *api.DatabaseClusterBackup) error
	DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string) error
	GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterBackup, error)
}

// DatabaseClusterRestoreHandler provides methods for handling operations on database cluster restores.
type DatabaseClusterRestoreHandler interface {
	ListDatabaseClusterRestores(ctx context.Context, user, namespace string) (*api.DatabaseClusterRestoreList, error)
	CreateDatabaseClusterRestore(ctx context.Context, user, req *api.DatabaseClusterRestore) error
	DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error
	GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterRestore, error)
	UpdateDatabaseClusterRestore(ctx context.Context, user string, req *api.DatabaseClusterRestore) error
}

// DatabaseEngineHandler provides methods for handling operations on database engines.
type DatabaseEngineHandler interface {
	ListDatabaseEngines(ctx context.Context, user, namespace string) (*api.DatabaseEngineList, error)
	GetDatabaseEngine(ctx context.Context, user, namespace, name string) (*api.DatabaseEngine, error)
	UpdateDatabaseEngine(ctx context.Context, user string, req *api.DatabaseEngine) error
	GetUpgradePlan(ctx context.Context, user, namespace, name string) (*api.UpgradePlan, error)
	ApproveUpgradePlan(ctx context.Context, user, namespace string) error
}

// BackupStorageHandler provides methods for handling operations on backup storages.
type BackupStorageHandler interface {
	ListBackupStorages(ctx context.Context, user, namespace string) ([]*api.BackupStorage, error)
	GetBackupStorage(ctx context.Context, user, namespace, name string) (*api.BackupStorage, error)
	CreateBackupStorage(ctx context.Context, user string, req *api.BackupStorage) error
	UpdateBackupStorage(ctx context.Context, user string, req *api.BackupStorage) error
	DeleteBackupStorage(ctx context.Context, user, namespace, name string) error
}

// MonitoringInstanceHandler provides methods for handling operations on monitoring instances.
type MonitoringInstanceHandler interface {
	CreateMonitoringInstance(ctx context.Context, user string, req *api.MonitoringInstance) error
	ListMonitoringInstances(ctx context.Context, user, namespaces string) ([]*api.MonitoringInstance, error)
	GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*api.MonitoringInstance, error)
	UpdateMonitoringInstance(ctx context.Context, user string, req *api.MonitoringInstance) error
	DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error
}
