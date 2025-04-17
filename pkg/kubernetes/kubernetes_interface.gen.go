// Code generated by ifacemaker; DO NOT EDIT.

package kubernetes

import (
	"context"

	goversion "github.com/hashicorp/go-version"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
)

// KubernetesConnector ...
type KubernetesConnector interface {
	// Accounts returns an implementation of the accounts interface that
	// manages everest accounts directly via ConfigMaps.
	Accounts() accounts.Interface
	// ListBackupStorages returns list of managed backup storages in a given namespace.
	// This method returns a list of full objects (meta and spec).
	ListBackupStorages(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.BackupStorageList, error)
	// GetBackupStorage returns backup storages by provided name and namespace.
	GetBackupStorage(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.BackupStorage, error)
	// CreateBackupStorage creates backup storages by provided object.
	CreateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) (*everestv1alpha1.BackupStorage, error)
	// UpdateBackupStorage updates backup storages by provided new object.
	UpdateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) (*everestv1alpha1.BackupStorage, error)
	// DeleteBackupStorage returns backup storages by provided name and namespace.
	DeleteBackupStorage(ctx context.Context, obj *everestv1alpha1.BackupStorage) error
	// DeleteBackupStorages deletes all backup storages in provided namespace.
	// This function will wait until all storages are deleted.
	DeleteBackupStorages(ctx context.Context, opts ...ctrlclient.ListOption) error
	// IsBackupStorageUsed checks if a backup storage that matches the criteria is used by any DB clusters.
	IsBackupStorageUsed(ctx context.Context, key ctrlclient.ObjectKey) (bool, error)
	// GetCatalogSource returns catalog source that matches the criteria.
	GetCatalogSource(ctx context.Context, key ctrlclient.ObjectKey) (*olmv1alpha1.CatalogSource, error)
	// DeleteCatalogSource deletes catalog source that matches the criteria.
	DeleteCatalogSource(ctx context.Context, obj *olmv1alpha1.CatalogSource) error
	// GetConfigMap returns k8s configmap that matches the criteria.
	GetConfigMap(ctx context.Context, key ctrlclient.ObjectKey) (*corev1.ConfigMap, error)
	// CreateConfigMap creates k8s configmap.
	CreateConfigMap(ctx context.Context, config *corev1.ConfigMap) (*corev1.ConfigMap, error)
	// UpdateConfigMap updates k8s configmap.
	UpdateConfigMap(ctx context.Context, config *corev1.ConfigMap) (*corev1.ConfigMap, error)
	// GetClusterServiceVersion retrieves a ClusterServiceVersion that matches the criteria.
	GetClusterServiceVersion(ctx context.Context, key ctrlclient.ObjectKey) (*olmv1alpha1.ClusterServiceVersion, error)
	// ListClusterServiceVersion list all CSVs that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListClusterServiceVersion(ctx context.Context, opts ...ctrlclient.ListOption) (*olmv1alpha1.ClusterServiceVersionList, error)
	// DeleteClusterServiceVersion deletes a ClusterServiceVersion that matches the criteria.
	DeleteClusterServiceVersion(ctx context.Context, obj *olmv1alpha1.ClusterServiceVersion) error
	// DeleteClusterServiceVersions deletes all ClusterServiceVersion that match the criteria.
	// This function will wait until all ClusterServiceVersion are deleted.
	DeleteClusterServiceVersions(ctx context.Context, opts ...ctrlclient.ListOption) error
	// ListCRDs lists all CRDs that match the criteria.
	ListCRDs(ctx context.Context, opts ...ctrlclient.ListOption) (*apiextv1.CustomResourceDefinitionList, error)
	// DeleteCRD deletes a CRD that matches the criteria.
	DeleteCRD(ctx context.Context, obj *apiextv1.CustomResourceDefinition) error
	// ListDatabaseClusters returns list of managed database clusters that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListDatabaseClusters(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.DatabaseClusterList, error)
	// GetDatabaseCluster returns database cluster that matches the criteria.
	GetDatabaseCluster(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.DatabaseCluster, error)
	// DeleteDatabaseCluster deletes database cluster that matches the criteria.
	DeleteDatabaseCluster(ctx context.Context, obj *everestv1alpha1.DatabaseCluster) error
	// CreateDatabaseCluster creates database cluster.
	CreateDatabaseCluster(ctx context.Context, cluster *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error)
	// UpdateDatabaseCluster updates database cluster.
	UpdateDatabaseCluster(ctx context.Context, cluster *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error)
	// DeleteDatabaseClusters deletes all database clusters that match the criteria.
	// This function will wait until all clusters are deleted.
	DeleteDatabaseClusters(ctx context.Context, opts ...ctrlclient.ListOption) error
	// DatabasesExist checks if there are databases that match criteria exist.
	DatabasesExist(ctx context.Context, opts ...ctrlclient.ListOption) (bool, error)
	// GetDatabaseClusterBackup returns database cluster backup that matches the criteria.
	// This method returns a list of full objects (meta and spec).
	GetDatabaseClusterBackup(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.DatabaseClusterBackup, error)
	// ListDatabaseClusterBackups returns database cluster backups that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListDatabaseClusterBackups(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.DatabaseClusterBackupList, error)
	// UpdateDatabaseClusterBackup updates database cluster backup.
	UpdateDatabaseClusterBackup(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error)
	// DeleteDatabaseClusterBackup deletes database cluster backup that matches the criteria.
	DeleteDatabaseClusterBackup(ctx context.Context, obj *everestv1alpha1.DatabaseClusterBackup) error
	// CreateDatabaseClusterBackup creates database cluster backup.
	CreateDatabaseClusterBackup(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error)
	// GetDatabaseClusterRestore returns database cluster restore that matches the criteria.
	GetDatabaseClusterRestore(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.DatabaseClusterRestore, error)
	// ListDatabaseClusterRestores returns database cluster restores that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListDatabaseClusterRestores(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.DatabaseClusterRestoreList, error)
	// UpdateDatabaseClusterRestore updates database cluster restore.
	UpdateDatabaseClusterRestore(ctx context.Context, restore *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error)
	// DeleteDatabaseClusterRestore deletes database cluster restore that matches the criteria.
	DeleteDatabaseClusterRestore(ctx context.Context, obj *everestv1alpha1.DatabaseClusterRestore) error
	// CreateDatabaseClusterRestore creates database cluster restore.
	CreateDatabaseClusterRestore(ctx context.Context, restore *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error)
	// ListDatabaseEngines returns list of managed database engines that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListDatabaseEngines(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.DatabaseEngineList, error)
	// GetDatabaseEngine returns database engine that matches the criteria.
	GetDatabaseEngine(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.DatabaseEngine, error)
	// UpdateDatabaseEngine updates the provided database engine.
	UpdateDatabaseEngine(ctx context.Context, engine *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error)
	// SetDatabaseEngineLock sets the lock on the database engine that matches the criteria.
	// The lock is automatically set to false once everest-operator completes its upgrade.
	SetDatabaseEngineLock(ctx context.Context, key ctrlclient.ObjectKey, locked bool) error
	// GetDeployment returns k8s deployment that matches the criteria.
	GetDeployment(ctx context.Context, key ctrlclient.ObjectKey) (*appsv1.Deployment, error)
	// UpdateDeployment updates a deployment and returns the updated object.
	UpdateDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error)
	// ListDeployments returns a list of deployments that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListDeployments(ctx context.Context, opts ...ctrlclient.ListOption) (*appsv1.DeploymentList, error)
	// DeleteDeployment deletes a deployment that matches the criteria.
	DeleteDeployment(ctx context.Context, obj *appsv1.Deployment) error
	// RestartDeployment restarts deployment that matches the criteria.
	RestartDeployment(ctx context.Context, key ctrlclient.ObjectKey) error
	// WaitForRollout waits for rollout of deployment that matches the criteria.
	WaitForRollout(ctx context.Context, key ctrlclient.ObjectKey) error
	// GetInstallPlan retrieves an OLM install plan that matches the criteria.
	GetInstallPlan(ctx context.Context, key ctrlclient.ObjectKey) (*olmv1alpha1.InstallPlan, error)
	// UpdateInstallPlan updates OLM install plan.
	UpdateInstallPlan(ctx context.Context, installPlan *olmv1alpha1.InstallPlan) (*olmv1alpha1.InstallPlan, error)
	// ApproveInstallPlan approves OLM install plan that matches the criteria.
	ApproveInstallPlan(ctx context.Context, key ctrlclient.ObjectKey) (bool, error)
	// Kubeconfig returns the path to the kubeconfig.
	// This value is available only if the client was created with New() function.
	Kubeconfig() string
	// K8sClient returns the kubernetes client.
	K8sClient() ctrlclient.Client
	// Config returns *rest.Config.
	Config() *rest.Config
	// WithKubernetesClient sets the k8s client.
	WithKubernetesClient(c ctrlclient.Client) *Kubernetes
	// Namespace returns the Everest system namespace.
	Namespace() string
	// GetEverestID returns the ID of the namespace where everest is deployed.
	GetEverestID(ctx context.Context) (string, error)
	// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
	GetClusterType(ctx context.Context) (ClusterType, error)
	// ListMonitoringConfigs returns list of managed monitoring configs that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListMonitoringConfigs(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.MonitoringConfigList, error)
	// GetMonitoringConfig returns monitoring configs that matches the criteria.
	GetMonitoringConfig(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.MonitoringConfig, error)
	// CreateMonitoringConfig creates monitoring config.
	CreateMonitoringConfig(ctx context.Context, config *everestv1alpha1.MonitoringConfig) (*everestv1alpha1.MonitoringConfig, error)
	// UpdateMonitoringConfig updates monitoring config.
	UpdateMonitoringConfig(ctx context.Context, config *everestv1alpha1.MonitoringConfig) (*everestv1alpha1.MonitoringConfig, error)
	// DeleteMonitoringConfig deletes monitoring config that matches the criteria.
	DeleteMonitoringConfig(ctx context.Context, obj *everestv1alpha1.MonitoringConfig) error
	// DeleteMonitoringConfigs deletes monitoring configs that matches the criteria.
	// This function will wait until all configs are deleted.
	DeleteMonitoringConfigs(ctx context.Context, opts ...ctrlclient.ListOption) error
	// IsMonitoringConfigUsed checks if a monitoring config that matches the criteria is used by any database cluster.
	IsMonitoringConfigUsed(ctx context.Context, key ctrlclient.ObjectKey) (bool, error)
	// CreateNamespace creates the given namespace.
	CreateNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error)
	// GetNamespace returns a namespace that matches the criteria.
	GetNamespace(ctx context.Context, key ctrlclient.ObjectKey) (*corev1.Namespace, error)
	// GetDBNamespaces returns a list of DB namespaces that managed by the Everest and match the criteria.
	GetDBNamespaces(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.NamespaceList, error)
	// DeleteNamespace deletes a namespace that matches the criteria.
	DeleteNamespace(ctx context.Context, obj *corev1.Namespace) error
	// ListNamespaces lists all namespaces that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListNamespaces(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.NamespaceList, error)
	// UpdateNamespace updates the given namespace.
	UpdateNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error)
	// ApplyManifestFile accepts manifest file contents, parses into []runtime.Object
	// and applies them against the cluster.
	ApplyManifestFile(ctx context.Context, fileBytes []byte, namespace string, ignoreObjects ...ctrlclient.Object) error
	// ApplyObject applies object.
	ApplyObject(obj runtime.Object) error
	// GetInstalledOperatorVersion returns the version of installed operator that matches the criteria.
	GetInstalledOperatorVersion(ctx context.Context, key ctrlclient.ObjectKey) (*goversion.Version, error)
	// ListInstalledOperators returns the list of installed operators that match the criteria.
	ListInstalledOperators(ctx context.Context, opts ...ctrlclient.ListOption) (*olmv1alpha1.SubscriptionList, error)
	// CreateRSAKeyPair creates a new RSA key pair and stores it in a secret.
	CreateRSAKeyPair(ctx context.Context) error
	// UpdateEverestSettings accepts the full list of Everest settings and updates the settings.
	UpdateEverestSettings(ctx context.Context, settings common.EverestSettings) error
	// GetEverestSettings returns Everest settings.
	GetEverestSettings(ctx context.Context) (common.EverestSettings, error)
	// GetAllClusterResources goes through all cluster nodes and sums their allocatable resources.
	GetAllClusterResources(ctx context.Context, clusterType ClusterType, volumes *corev1.PersistentVolumeList) (uint64, uint64, uint64, error)
	// GetConsumedCPUAndMemory returns consumed CPU and Memory in given namespace. If namespace
	// is empty, it tries to get them from all namespaces.
	GetConsumedCPUAndMemory(ctx context.Context, namespace string) (cpuMillis uint64, memoryBytes uint64, err error)
	// GetConsumedDiskBytes returns consumed bytes. The strategy differs based on k8s cluster type.
	GetConsumedDiskBytes(_ context.Context, clusterType ClusterType, volumes *corev1.PersistentVolumeList) (uint64, error)
	// ListSecrets returns list of secrets that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListSecrets(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.SecretList, error)
	// GetSecret returns a secret that matches the criteria.
	GetSecret(ctx context.Context, key ctrlclient.ObjectKey) (*corev1.Secret, error)
	// CreateSecret creates a secret.
	CreateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	// UpdateSecret updates a secret.
	UpdateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	// DeleteSecret deletes a secret that matches the criteria.
	DeleteSecret(ctx context.Context, obj *corev1.Secret) error
	// GetService returns service that matches the criteria.
	GetService(ctx context.Context, key ctrlclient.ObjectKey) (*corev1.Service, error)
	// ListPersistentVolumes returns list of persistent volumes that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListPersistentVolumes(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.PersistentVolumeList, error)
	// ListStorageClasses returns list of storage classes that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListStorageClasses(ctx context.Context, opts ...ctrlclient.ListOption) (*storagev1.StorageClassList, error)
	// GetSubscription returns OLM subscription that matches the criteria.
	GetSubscription(ctx context.Context, key ctrlclient.ObjectKey) (*olmv1alpha1.Subscription, error)
	// ListSubscriptions lists OLM subscriptions that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListSubscriptions(ctx context.Context, opts ...ctrlclient.ListOption) (*olmv1alpha1.SubscriptionList, error)
	// DeleteSubscription deletes OLM subscription that matches the criteria.
	DeleteSubscription(ctx context.Context, obj *olmv1alpha1.Subscription) error
	// ListPods returns list of pods that match the criteria.
	// This method returns a list of full objects (meta and spec).
	ListPods(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.PodList, error)
}
