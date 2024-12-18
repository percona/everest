// Code generated by ifacemaker; DO NOT EDIT.

package kubernetes

import (
	"context"

	goversion "github.com/hashicorp/go-version"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
)

// KubernetesConnector ...
type KubernetesConnector interface {
	// Accounts returns a new client for managing everest user accounts.
	//
	//nolint:ireturn,stylecheck
	Accounts() accounts.Interface
	// ListBackupStorages returns list of managed backup storages.
	ListBackupStorages(ctx context.Context, namespace string) (*everestv1alpha1.BackupStorageList, error)
	// GetBackupStorage returns backup storages by provided name.
	GetBackupStorage(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error)
	// CreateBackupStorage returns backup storages by provided name.
	CreateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) error
	// UpdateBackupStorage returns backup storages by provided name.
	UpdateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) error
	// DeleteBackupStorage returns backup storages by provided name.
	DeleteBackupStorage(ctx context.Context, namespace, name string) error
	// DeleteBackupStorages deletes all backup storages in provided namespace.
	// This function will wait until all storages are deleted.
	DeleteBackupStorages(ctx context.Context, namespace string) error
	// IsBackupStorageUsed checks if a backup storage in a given namespace is used by any clusters
	// in that namespace.
	//
	//nolint:cyclop
	IsBackupStorageUsed(ctx context.Context, namespace, name string) (bool, error)
	// GetConfigMap returns k8s configmap by provided name and namespace.
	GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	// ListDatabaseEngines returns list of managed database clusters.
	ListDatabaseEngines(ctx context.Context, namespace string) (*everestv1alpha1.DatabaseEngineList, error)
	// GetDatabaseEngine returns database clusters by provided name.
	GetDatabaseEngine(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseEngine, error)
	// UpdateDatabaseEngine updates the provided database engine.
	UpdateDatabaseEngine(ctx context.Context, namespace string, engine *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error)
	// SetDatabaseEngineLock sets the lock on the database engine.
	// The lock is automatically set to false once everest-operator completes its upgrade.
	SetDatabaseEngineLock(ctx context.Context, namespace, name string, locked bool) error
	// GetDeployment returns k8s deployment by provided name and namespace.
	GetDeployment(ctx context.Context, name, namespace string) (*appsv1.Deployment, error)
	// UpdateDeployment updates a deployment and returns the updated object.
	UpdateDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error)
	// ListDeployments returns a list of deployments in the provided namespace.
	ListDeployments(ctx context.Context, namespace string) (*appsv1.DeploymentList, error)
	// DeleteDeployment deletes a deployment by provided name and namespace.
	DeleteDeployment(ctx context.Context, name, namespace string) error
	// ApproveInstallPlan approves an install plan.
	ApproveInstallPlan(ctx context.Context, namespace, installPlanName string) (bool, error)
	// Kubeconfig returns the path to the kubeconfig.
	Kubeconfig() string
	// Config returns *rest.Config.
	Config() *rest.Config
	// WithClient sets the client connector.
	WithClient(c client.KubeClientConnector) *Kubernetes
	// Namespace returns the current namespace.
	Namespace() string
	// ClusterName returns the name of the k8s cluster.
	ClusterName() string
	// GetEverestID returns the ID of the namespace where everest is deployed.
	GetEverestID(ctx context.Context) (string, error)
	// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
	GetClusterType(ctx context.Context) (ClusterType, error)
	// GetCatalogSource returns catalog source.
	GetCatalogSource(ctx context.Context, name, namespace string) (*olmv1alpha1.CatalogSource, error)
	// DeleteCatalogSource deletes catalog source.
	DeleteCatalogSource(ctx context.Context, name, namespace string) error
	// GetSubscription returns subscription.
	GetSubscription(ctx context.Context, name, namespace string) (*olmv1alpha1.Subscription, error)
	// ListSubscriptions lists subscriptions.
	ListSubscriptions(ctx context.Context, namespace string) (*olmv1alpha1.SubscriptionList, error)
	// GetServerVersion returns server version.
	GetServerVersion() (*version.Info, error)
	// GetClusterServiceVersion retrieves a ClusterServiceVersion by namespaced name.
	GetClusterServiceVersion(ctx context.Context, key types.NamespacedName) (*olmv1alpha1.ClusterServiceVersion, error)
	// ListClusterServiceVersion list all CSVs for the given namespace.
	ListClusterServiceVersion(ctx context.Context, namespace string) (*olmv1alpha1.ClusterServiceVersionList, error)
	// ListCRDs lists all CRDs.
	ListCRDs(ctx context.Context) (*apiextv1.CustomResourceDefinitionList, error)
	// DeleteCRD deletes a CRD by name.
	DeleteCRD(ctx context.Context, name string) error
	// DeleteClusterServiceVersion deletes a ClusterServiceVersion.
	DeleteClusterServiceVersion(ctx context.Context, key types.NamespacedName) error
	// DeleteSubscription deletes a subscription by namespaced name.
	DeleteSubscription(ctx context.Context, key types.NamespacedName) error
	// RestartDeployment restarts the given deployment.
	RestartDeployment(ctx context.Context, name, namespace string) error
	// ApplyManifestFile accepts manifest file contents, parses into []runtime.Object
	// and applies them against the cluster.
	ApplyManifestFile(files []byte, namespace string) error
	// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
	GetDBNamespaces(ctx context.Context) ([]string, error)
	// WaitForRollout waits for rollout of a provided deployment in the provided namespace.
	WaitForRollout(ctx context.Context, name, namespace string) error
	// DeleteManifestFile accepts manifest file contents, parses into []runtime.Object
	// and deletes them from the cluster.
	DeleteManifestFile(fileBytes []byte, namespace string) error
	// ListMonitoringConfigs returns list of managed monitoring configs.
	ListMonitoringConfigs(ctx context.Context, namespace string) (*everestv1alpha1.MonitoringConfigList, error)
	// GetMonitoringConfig returns monitoring configs by provided name.
	GetMonitoringConfig(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error)
	// CreateMonitoringConfig returns monitoring configs by provided name.
	CreateMonitoringConfig(ctx context.Context, storage *everestv1alpha1.MonitoringConfig) error
	// UpdateMonitoringConfig returns monitoring configs by provided name.
	UpdateMonitoringConfig(ctx context.Context, storage *everestv1alpha1.MonitoringConfig) error
	// DeleteMonitoringConfig returns monitoring configs by provided name.
	DeleteMonitoringConfig(ctx context.Context, namespace, name string) error
	// DeleteMonitoringConfigs deletes all monitoring configs in provided namespace.
	// This function will wait until all configs are deleted.
	DeleteMonitoringConfigs(ctx context.Context, namespace string) error
	// IsMonitoringConfigUsed checks if a monitoring config is used by any database cluster in the provided namespace.
	IsMonitoringConfigUsed(ctx context.Context, namespace, name string) (bool, error)
	// GetMonitoringConfigsBySecretName returns a list of monitoring configs which use
	// the provided secret name.
	GetMonitoringConfigsBySecretName(ctx context.Context, namespace, secretName string) ([]*everestv1alpha1.MonitoringConfig, error)
	// CreateNamespace creates the given namespace.
	CreateNamespace(ctx context.Context, namespace *corev1.Namespace) error
	// GetNamespace returns a namespace.
	GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error)
	// DeleteNamespace deletes a namespace.
	DeleteNamespace(ctx context.Context, name string) error
	// ListNamespaces lists all namespaces.
	ListNamespaces(ctx context.Context, opts metav1.ListOptions) (*corev1.NamespaceList, error)
	// UpdateNamespace updates the given namespace.
	UpdateNamespace(ctx context.Context, namespace *corev1.Namespace, opts metav1.UpdateOptions) (*corev1.Namespace, error)
	// OperatorInstalledVersion returns the installed version of operator by name.
	OperatorInstalledVersion(ctx context.Context, namespace, name string) (*goversion.Version, error)
	// CreateRSAKeyPair creates a new RSA key pair and stores it in a secret.
	CreateRSAKeyPair(ctx context.Context) error
	// UpdateEverestSettings accepts the full list of Everest settings and updates the settings.
	UpdateEverestSettings(ctx context.Context, settings common.EverestSettings) error
	// GetEverestSettings returns Everest settings.
	GetEverestSettings(ctx context.Context) (common.EverestSettings, error)
	// ListSecrets returns secret by name.
	ListSecrets(ctx context.Context, namespace string) (*corev1.SecretList, error)
	// GetSecret returns a secret by name.
	GetSecret(ctx context.Context, namespace, name string) (*corev1.Secret, error)
	// CreateSecret creates a secret.
	CreateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	// SetSecret creates or updates an existing secret.
	SetSecret(secret *corev1.Secret) error
	// UpdateSecret updates a secret.
	UpdateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	// DeleteSecret deletes a secret.
	DeleteSecret(ctx context.Context, namespace, name string) error
}
