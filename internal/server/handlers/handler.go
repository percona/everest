// Package handlers contains the interface and types for the Everest API handlers.
package handlers

//go:generate ../../../bin/mockery --name=Handler --case=snake --inpackage

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

// Handler provides an abstraction for the core business logic of the Everest API.
// Each implementation of a handler is responsible for handling a specific set of operations (e.g, request validation, RBAC, KubeAPI, etc.).
// Handlers may be chained together using the SetNext() method to form a chain of responsibility.
// Each Handler implementation is individually responsible for calling the next handler in the chain.
//
//nolint:interfacebloat
type Handler interface {
	// SetNext sets the next handler to call in the chain.
	SetNext(h Handler)

	NamespacesHandler
	DatabaseClusterHandler
	DatabaseClusterBackupHandler
	DatabaseClusterRestoreHandler
	DatabaseEngineHandler
	BackupStorageHandler
	MonitoringInstanceHandler
	PodSchedulingPolicyHandler
	ClusterHandler

	GetKubernetesClusterResources(ctx context.Context, cluster string) (*api.KubernetesClusterResources, error)
	GetKubernetesClusterInfo(ctx context.Context, cluster string) (*api.KubernetesClusterInfo, error)
	GetUserPermissions(ctx context.Context) (*api.UserPermissions, error)
	GetSettings(ctx context.Context) (*api.Settings, error)
}

// DatabaseClusterHandler provides methods for handling operations on database clusters.
type DatabaseClusterHandler interface {
	CreateDatabaseCluster(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error)
	UpdateDatabaseCluster(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error)
	ListDatabaseClusters(ctx context.Context, cluster, namespace string) (*everestv1alpha1.DatabaseClusterList, error)
	DeleteDatabaseCluster(ctx context.Context, cluster, namespace, name string, delReq *api.DeleteDatabaseClusterParams) error
	GetDatabaseCluster(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseCluster, error)
	GetDatabaseClusterCredentials(ctx context.Context, cluster, namespace, name string) (*api.DatabaseClusterCredential, error)
	GetDatabaseClusterComponents(ctx context.Context, cluster, namespace, name string) ([]api.DatabaseClusterComponent, error)
	GetDatabaseClusterPitr(ctx context.Context, cluster, namespace, name string) (*api.DatabaseClusterPitr, error)
}

// NamespacesHandler provides methods for handling operations on namespaces.
type NamespacesHandler interface {
	ListNamespaces(ctx context.Context, cluster string) ([]string, error)
}

// DatabaseClusterBackupHandler provides methods for handling operations on database cluster backups.
type DatabaseClusterBackupHandler interface {
	GetDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error)
	ListDatabaseClusterBackups(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterBackupList, error)
	CreateDatabaseClusterBackup(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error)
	DeleteDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string, req *api.DeleteDatabaseClusterBackupParams) error
}

// DatabaseClusterRestoreHandler provides methods for handling operations on database cluster restores.
type DatabaseClusterRestoreHandler interface {
	CreateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error)
	UpdateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error)
	GetDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error)
	ListDatabaseClusterRestores(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error)
	DeleteDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) error
}

// DatabaseEngineHandler provides methods for handling operations on database engines.
type DatabaseEngineHandler interface {
	UpdateDatabaseEngine(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error)
	ListDatabaseEngines(ctx context.Context, cluster, namespace string) (*everestv1alpha1.DatabaseEngineList, error)
	GetDatabaseEngine(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseEngine, error)
	GetUpgradePlan(ctx context.Context, cluster, namespace string) (*api.UpgradePlan, error)
	ApproveUpgradePlan(ctx context.Context, cluster, namespace string) error
}

// BackupStorageHandler provides methods for handling operations on backup storages.
type BackupStorageHandler interface {
	CreateBackupStorage(ctx context.Context, cluster, namespace string, req *api.CreateBackupStorageParams) (*everestv1alpha1.BackupStorage, error)
	UpdateBackupStorage(ctx context.Context, cluster, namespace, name string, req *api.UpdateBackupStorageParams) (*everestv1alpha1.BackupStorage, error)
	ListBackupStorages(ctx context.Context, cluster, namespace string) (*everestv1alpha1.BackupStorageList, error)
	GetBackupStorage(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.BackupStorage, error)
	DeleteBackupStorage(ctx context.Context, cluster, namespace, name string) error
}

// MonitoringInstanceHandler provides methods for handling operations on monitoring instances.
type MonitoringInstanceHandler interface {
	CreateMonitoringInstance(ctx context.Context, cluster, namespace string, req *api.CreateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error)
	UpdateMonitoringInstance(ctx context.Context, cluster, namespace, name string, req *api.UpdateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error)
	ListMonitoringInstances(ctx context.Context, cluster, namespaces string) (*everestv1alpha1.MonitoringConfigList, error)
	GetMonitoringInstance(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.MonitoringConfig, error)
	DeleteMonitoringInstance(ctx context.Context, cluster, namespace, name string) error
}

// PodSchedulingPolicyHandler provides methods for handling operations on pod scheduling policies.
type PodSchedulingPolicyHandler interface {
	CreatePodSchedulingPolicy(ctx context.Context, cluster string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error)
	UpdatePodSchedulingPolicy(ctx context.Context, cluster string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error)
	ListPodSchedulingPolicies(ctx context.Context, cluster string, params *api.ListPodSchedulingPolicyParams) (*everestv1alpha1.PodSchedulingPolicyList, error)
	DeletePodSchedulingPolicy(ctx context.Context, cluster, name string) error
	GetPodSchedulingPolicy(ctx context.Context, cluster, name string) (*everestv1alpha1.PodSchedulingPolicy, error)
}

// APICluster represents a minimal cluster object for the API.
type APICluster struct {
	Name   string `json:"name"`
	Server string `json:"server"`
}

// ClusterHandler provides methods for handling operations on clusters.
type ClusterHandler interface {
	ListClusters(ctx context.Context) ([]APICluster, error)
	GetCluster(ctx context.Context, name string) (*APICluster, error)
}
