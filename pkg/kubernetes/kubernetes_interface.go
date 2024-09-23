// Code generated by ifacemaker; DO NOT EDIT.

package kubernetes

import (
	"context"

	goversion "github.com/hashicorp/go-version"
	"github.com/operator-framework/api/pkg/operators/v1alpha1"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

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
	// IsBackupStorageUsed checks if a backup storage in a given namespace is used by any clusters
	// in that namespace.
	//
	//nolint:cyclop
	IsBackupStorageUsed(ctx context.Context, namespace, name string) (bool, error)
	// WaitForCSVSucceeded waits until CSV phase is "succeeded".
	WaitForCSVSucceeded(ctx context.Context, namespace, name string) error
	// CSVNameFromOperator returns CSV name based on operator and version.
	CSVNameFromOperator(operatorName string, version *goversion.Version) string
	// GetConfigMap returns k8s configmap by provided name and namespace.
	GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	// GetDeployment returns k8s deployment by provided name and namespace.
	GetDeployment(ctx context.Context, name, namespace string) (*appsv1.Deployment, error)
	// UpdateDeployment updates a deployment and returns the updated object.
	UpdateDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error)
	// WaitForInstallPlan waits until an install plan for the given operator and version is available.
	WaitForInstallPlan(ctx context.Context, namespace, operatorName string, version *goversion.Version) (*olmv1alpha1.InstallPlan, error)
	// ApproveInstallPlan approves an install plan.
	ApproveInstallPlan(ctx context.Context, namespace, installPlanName string) (bool, error)
	// WaitForInstallPlanCompleted waits until install plan phase is "complete".
	WaitForInstallPlanCompleted(ctx context.Context, namespace, name string) error
	// Config returns *rest.Config.
	Config() *rest.Config
	// WithClient sets the client connector.
	WithClient(c client.KubeClientConnector) *Kubernetes
	// Namespace returns the current namespace.
	Namespace() string
	// ClusterName returns the name of the k8s cluster.
	ClusterName() string
	// GetDefaultStorageClassName returns first storageClassName from kubernetes cluster.
	GetDefaultStorageClassName(ctx context.Context) (string, error)
	// GetEverestID returns the ID of the namespace where everest is deployed.
	GetEverestID(ctx context.Context) (string, error)
	// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
	GetClusterType(ctx context.Context) (ClusterType, error)
	// GetPSMDBOperatorVersion parses PSMDB operator version from operator deployment.
	GetPSMDBOperatorVersion(ctx context.Context) (string, error)
	// GetPXCOperatorVersion parses PXC operator version from operator deployment.
	GetPXCOperatorVersion(ctx context.Context) (string, error)
	// GetDBaaSOperatorVersion parses DBaaS operator version from operator deployment.
	GetDBaaSOperatorVersion(ctx context.Context) (string, error)
	// CreatePMMSecret creates pmm secret in kubernetes.
	CreatePMMSecret(namespace, secretName string, secrets map[string][]byte) error
	// CreateRestore creates a restore.
	CreateRestore(restore *everestv1alpha1.DatabaseClusterRestore) error
	// GetLogs returns logs.
	GetLogs(ctx context.Context, containerStatuses []corev1.ContainerStatus, pod, container string) ([]string, error)
	// GetEvents returns pod's events as a slice of strings.
	GetEvents(ctx context.Context, pod string) ([]string, error)
	// InstallOLMOperator installs OLM operator.
	InstallOLMOperator(ctx context.Context, upgrade bool) error
	// InstallPerconaCatalog installs percona catalog and ensures that packages are available.
	InstallPerconaCatalog(ctx context.Context, version *goversion.Version) error
	// InstallOperator installs an operator via OLM.
	InstallOperator(ctx context.Context, req InstallOperatorRequest) error
	// CreateOperatorGroup creates operator group in the given namespace.
	CreateOperatorGroup(ctx context.Context, name, namespace string, targetNamespaces []string) error
	// ListSubscriptions all the subscriptions in the namespace.
	ListSubscriptions(ctx context.Context, namespace string) (*olmv1alpha1.SubscriptionList, error)
	// UpgradeOperator upgrades an operator to the next available version.
	UpgradeOperator(ctx context.Context, namespace, name string) error
	// GetServerVersion returns server version.
	GetServerVersion() (*version.Info, error)
	// GetClusterServiceVersion retrieves a ClusterServiceVersion by namespaced name.
	GetClusterServiceVersion(ctx context.Context, key types.NamespacedName) (*olmv1alpha1.ClusterServiceVersion, error)
	// ListClusterServiceVersion list all CSVs for the given namespace.
	ListClusterServiceVersion(ctx context.Context, namespace string) (*olmv1alpha1.ClusterServiceVersionList, error)
	// UpdateClusterServiceVersion updates a ClusterServiceVersion and returns the updated object.
	UpdateClusterServiceVersion(ctx context.Context, csv *olmv1alpha1.ClusterServiceVersion) (*olmv1alpha1.ClusterServiceVersion, error)
	// DeleteClusterServiceVersion deletes a ClusterServiceVersion.
	DeleteClusterServiceVersion(ctx context.Context, key types.NamespacedName) error
	// DeleteObject deletes an object.
	DeleteObject(obj runtime.Object) error
	// ProvisionMonitoring provisions PMM monitoring.
	ProvisionMonitoring(namespace string) error
	// RestartOperator restarts the deployment of an operator managed by OLM.
	//
	//nolint:funlen
	RestartOperator(ctx context.Context, name, namespace string) error
	// RestartDeployment restarts the given deployment.
	RestartDeployment(ctx context.Context, name, namespace string) error
	// ListEngineDeploymentNames returns a string array containing found engine deployments for the Everest.
	ListEngineDeploymentNames(ctx context.Context, namespace string) ([]string, error)
	// ApplyObject applies object.
	ApplyObject(obj runtime.Object) error
	// InstallEverest downloads the manifest file and applies it against provisioned k8s cluster.
	InstallEverest(ctx context.Context, namespace string, version *goversion.Version, skipObjs ...ctrlclient.Object) error
	// DeleteEverest downloads the manifest file and deletes it from provisioned k8s cluster.
	DeleteEverest(ctx context.Context, namespace string, version *goversion.Version) error
	// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
	GetDBNamespaces(ctx context.Context) ([]string, error)
	// WaitForRollout waits for rollout of a provided deployment in the provided namespace.
	WaitForRollout(ctx context.Context, name, namespace string) error
	// UpdateClusterRoleBinding updates namespaces list for the cluster role by provided name.
	UpdateClusterRoleBinding(ctx context.Context, name string, namespaces []string) error
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
	// ListInstallPlans lists install plans.
	ListInstallPlans(ctx context.Context, namespace string) (*v1alpha1.InstallPlanList, error)
	// UpdateInstallPlan updates the existing install plan in the specified namespace.
	UpdateInstallPlan(ctx context.Context, namespace string, installPlan *v1alpha1.InstallPlan) (*v1alpha1.InstallPlan, error)
	// GetSubscriptionCSV returns the CSV name and namespace for the given subscription.
	GetSubscriptionCSV(ctx context.Context, namespace, name string) (types.NamespacedName, error)
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
