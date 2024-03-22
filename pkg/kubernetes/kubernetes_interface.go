// Code generated by ifacemaker; DO NOT EDIT.

package kubernetes

import (
	"context"

	goversion "github.com/hashicorp/go-version"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// KubernetesConnector ...
type KubernetesConnector interface {
	// GetDeployment returns k8s deployment by provided name and namespace.
	GetDeployment(ctx context.Context, name, namespace string) (*appsv1.Deployment, error)
	// Config returns *rest.Config.
	Config() *rest.Config
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
	// CreateNamespace creates a new namespace.
	CreateNamespace(name string) error
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
	// DeleteClusterServiceVersion deletes a ClusterServiceVersion.
	DeleteClusterServiceVersion(ctx context.Context, key types.NamespacedName) error
	// DeleteObject deletes an object.
	DeleteObject(obj runtime.Object) error
	// ProvisionMonitoring provisions PMM monitoring.
	ProvisionMonitoring(namespace string) error
	// RestartEverest restarts everest pod.
	RestartEverest(ctx context.Context, name, namespace string) error
	// ListEngineDeploymentNames returns a string array containing found engine deployments for the Everest.
	ListEngineDeploymentNames(ctx context.Context, namespace string) ([]string, error)
	// ApplyObject applies object.
	ApplyObject(obj runtime.Object) error
	// InstallEverest downloads the manifest file and applies it against provisioned k8s cluster.
	InstallEverest(ctx context.Context, namespace string, version *goversion.Version) error
	// DeleteEverest downloads the manifest file and deletes it from provisioned k8s cluster.
	DeleteEverest(ctx context.Context, namespace string, version *goversion.Version) error
	// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
	GetDBNamespaces(ctx context.Context, namespace string) ([]string, error)
	// WaitForRollout waits for rollout of a provided deployment in the provided namespace.
	WaitForRollout(ctx context.Context, name, namespace string) error
	// UpdateClusterRoleBinding updates namespaces list for the cluster role by provided name.
	UpdateClusterRoleBinding(ctx context.Context, name string, namespaces []string) error
	// OperatorInstalledVersion returns the installed version of operator by name.
	OperatorInstalledVersion(ctx context.Context, namespace, name string) (*goversion.Version, error)
}
