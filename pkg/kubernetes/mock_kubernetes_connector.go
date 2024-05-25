// Code generated by mockery v2.42.1. DO NOT EDIT.

package kubernetes

import (
	context "context"

	version "github.com/hashicorp/go-version"
	operatorsv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	mock "github.com/stretchr/testify/mock"
	v1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	types "k8s.io/apimachinery/pkg/types"
	pkgversion "k8s.io/apimachinery/pkg/version"
	rest "k8s.io/client-go/rest"

	v1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	accounts "github.com/percona/everest/pkg/accounts"
	client "github.com/percona/everest/pkg/kubernetes/client"
)

// MockKubernetesConnector is an autogenerated mock type for the KubernetesConnector type
type MockKubernetesConnector struct {
	mock.Mock
}

// Accounts provides a mock function with given fields:
func (_m *MockKubernetesConnector) Accounts() accounts.Interface {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for Accounts")
	}

	var r0 accounts.Interface
	if rf, ok := ret.Get(0).(func() accounts.Interface); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(accounts.Interface)
		}
	}

	return r0
}

// ApplyObject provides a mock function with given fields: obj
func (_m *MockKubernetesConnector) ApplyObject(obj runtime.Object) error {
	ret := _m.Called(obj)

	if len(ret) == 0 {
		panic("no return value specified for ApplyObject")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(runtime.Object) error); ok {
		r0 = rf(obj)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// ApproveInstallPlan provides a mock function with given fields: ctx, namespace, installPlanName
func (_m *MockKubernetesConnector) ApproveInstallPlan(ctx context.Context, namespace string, installPlanName string) (bool, error) {
	ret := _m.Called(ctx, namespace, installPlanName)

	if len(ret) == 0 {
		panic("no return value specified for ApproveInstallPlan")
	}

	var r0 bool
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (bool, error)); ok {
		return rf(ctx, namespace, installPlanName)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) bool); ok {
		r0 = rf(ctx, namespace, installPlanName)
	} else {
		r0 = ret.Get(0).(bool)
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, namespace, installPlanName)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ClusterName provides a mock function with given fields:
func (_m *MockKubernetesConnector) ClusterName() string {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for ClusterName")
	}

	var r0 string
	if rf, ok := ret.Get(0).(func() string); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(string)
	}

	return r0
}

// Config provides a mock function with given fields:
func (_m *MockKubernetesConnector) Config() *rest.Config {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for Config")
	}

	var r0 *rest.Config
	if rf, ok := ret.Get(0).(func() *rest.Config); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*rest.Config)
		}
	}

	return r0
}

// CreateNamespace provides a mock function with given fields: name
func (_m *MockKubernetesConnector) CreateNamespace(name string) error {
	ret := _m.Called(name)

	if len(ret) == 0 {
		panic("no return value specified for CreateNamespace")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// CreateOperatorGroup provides a mock function with given fields: ctx, name, namespace, targetNamespaces
func (_m *MockKubernetesConnector) CreateOperatorGroup(ctx context.Context, name string, namespace string, targetNamespaces []string) error {
	ret := _m.Called(ctx, name, namespace, targetNamespaces)

	if len(ret) == 0 {
		panic("no return value specified for CreateOperatorGroup")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, []string) error); ok {
		r0 = rf(ctx, name, namespace, targetNamespaces)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// CreatePMMSecret provides a mock function with given fields: namespace, secretName, secrets
func (_m *MockKubernetesConnector) CreatePMMSecret(namespace string, secretName string, secrets map[string][]byte) error {
	ret := _m.Called(namespace, secretName, secrets)

	if len(ret) == 0 {
		panic("no return value specified for CreatePMMSecret")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string, string, map[string][]byte) error); ok {
		r0 = rf(namespace, secretName, secrets)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// CreateRestore provides a mock function with given fields: restore
func (_m *MockKubernetesConnector) CreateRestore(restore *v1alpha1.DatabaseClusterRestore) error {
	ret := _m.Called(restore)

	if len(ret) == 0 {
		panic("no return value specified for CreateRestore")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(*v1alpha1.DatabaseClusterRestore) error); ok {
		r0 = rf(restore)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteClusterServiceVersion provides a mock function with given fields: ctx, key
func (_m *MockKubernetesConnector) DeleteClusterServiceVersion(ctx context.Context, key types.NamespacedName) error {
	ret := _m.Called(ctx, key)

	if len(ret) == 0 {
		panic("no return value specified for DeleteClusterServiceVersion")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, types.NamespacedName) error); ok {
		r0 = rf(ctx, key)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteEverest provides a mock function with given fields: ctx, namespace, _a2
func (_m *MockKubernetesConnector) DeleteEverest(ctx context.Context, namespace string, _a2 *version.Version) error {
	ret := _m.Called(ctx, namespace, _a2)

	if len(ret) == 0 {
		panic("no return value specified for DeleteEverest")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *version.Version) error); ok {
		r0 = rf(ctx, namespace, _a2)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteObject provides a mock function with given fields: obj
func (_m *MockKubernetesConnector) DeleteObject(obj runtime.Object) error {
	ret := _m.Called(obj)

	if len(ret) == 0 {
		panic("no return value specified for DeleteObject")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(runtime.Object) error); ok {
		r0 = rf(obj)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// GetClusterServiceVersion provides a mock function with given fields: ctx, key
func (_m *MockKubernetesConnector) GetClusterServiceVersion(ctx context.Context, key types.NamespacedName) (*operatorsv1alpha1.ClusterServiceVersion, error) {
	ret := _m.Called(ctx, key)

	if len(ret) == 0 {
		panic("no return value specified for GetClusterServiceVersion")
	}

	var r0 *operatorsv1alpha1.ClusterServiceVersion
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, types.NamespacedName) (*operatorsv1alpha1.ClusterServiceVersion, error)); ok {
		return rf(ctx, key)
	}
	if rf, ok := ret.Get(0).(func(context.Context, types.NamespacedName) *operatorsv1alpha1.ClusterServiceVersion); ok {
		r0 = rf(ctx, key)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*operatorsv1alpha1.ClusterServiceVersion)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, types.NamespacedName) error); ok {
		r1 = rf(ctx, key)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetClusterType provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetClusterType(ctx context.Context) (ClusterType, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetClusterType")
	}

	var r0 ClusterType
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (ClusterType, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) ClusterType); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(ClusterType)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDBNamespaces provides a mock function with given fields: ctx, namespace
func (_m *MockKubernetesConnector) GetDBNamespaces(ctx context.Context, namespace string) ([]string, error) {
	ret := _m.Called(ctx, namespace)

	if len(ret) == 0 {
		panic("no return value specified for GetDBNamespaces")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) ([]string, error)); ok {
		return rf(ctx, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) []string); ok {
		r0 = rf(ctx, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDBaaSOperatorVersion provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetDBaaSOperatorVersion(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetDBaaSOperatorVersion")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDefaultStorageClassName provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetDefaultStorageClassName(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetDefaultStorageClassName")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDeployment provides a mock function with given fields: ctx, name, namespace
func (_m *MockKubernetesConnector) GetDeployment(ctx context.Context, name string, namespace string) (*v1.Deployment, error) {
	ret := _m.Called(ctx, name, namespace)

	if len(ret) == 0 {
		panic("no return value specified for GetDeployment")
	}

	var r0 *v1.Deployment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*v1.Deployment, error)); ok {
		return rf(ctx, name, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *v1.Deployment); ok {
		r0 = rf(ctx, name, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1.Deployment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, name, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetEvents provides a mock function with given fields: ctx, pod
func (_m *MockKubernetesConnector) GetEvents(ctx context.Context, pod string) ([]string, error) {
	ret := _m.Called(ctx, pod)

	if len(ret) == 0 {
		panic("no return value specified for GetEvents")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) ([]string, error)); ok {
		return rf(ctx, pod)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) []string); ok {
		r0 = rf(ctx, pod)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, pod)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetEverestID provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetEverestID(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetEverestID")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetJWTToken provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetJWTToken(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetJWTToken")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetLogs provides a mock function with given fields: ctx, containerStatuses, pod, container
func (_m *MockKubernetesConnector) GetLogs(ctx context.Context, containerStatuses []corev1.ContainerStatus, pod string, container string) ([]string, error) {
	ret := _m.Called(ctx, containerStatuses, pod, container)

	if len(ret) == 0 {
		panic("no return value specified for GetLogs")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, []corev1.ContainerStatus, string, string) ([]string, error)); ok {
		return rf(ctx, containerStatuses, pod, container)
	}
	if rf, ok := ret.Get(0).(func(context.Context, []corev1.ContainerStatus, string, string) []string); ok {
		r0 = rf(ctx, containerStatuses, pod, container)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, []corev1.ContainerStatus, string, string) error); ok {
		r1 = rf(ctx, containerStatuses, pod, container)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetPSMDBOperatorVersion provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetPSMDBOperatorVersion(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetPSMDBOperatorVersion")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetPXCOperatorVersion provides a mock function with given fields: ctx
func (_m *MockKubernetesConnector) GetPXCOperatorVersion(ctx context.Context) (string, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetPXCOperatorVersion")
	}

	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (string, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) string); ok {
		r0 = rf(ctx)
	} else {
		r0 = ret.Get(0).(string)
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetServerVersion provides a mock function with given fields:
func (_m *MockKubernetesConnector) GetServerVersion() (*pkgversion.Info, error) {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for GetServerVersion")
	}

	var r0 *pkgversion.Info
	var r1 error
	if rf, ok := ret.Get(0).(func() (*pkgversion.Info, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *pkgversion.Info); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*pkgversion.Info)
		}
	}

	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// InstallEverest provides a mock function with given fields: ctx, namespace, _a2
func (_m *MockKubernetesConnector) InstallEverest(ctx context.Context, namespace string, _a2 *version.Version) error {
	ret := _m.Called(ctx, namespace, _a2)

	if len(ret) == 0 {
		panic("no return value specified for InstallEverest")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *version.Version) error); ok {
		r0 = rf(ctx, namespace, _a2)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// InstallOLMOperator provides a mock function with given fields: ctx, upgrade
func (_m *MockKubernetesConnector) InstallOLMOperator(ctx context.Context, upgrade bool) error {
	ret := _m.Called(ctx, upgrade)

	if len(ret) == 0 {
		panic("no return value specified for InstallOLMOperator")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, bool) error); ok {
		r0 = rf(ctx, upgrade)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// InstallOperator provides a mock function with given fields: ctx, req
func (_m *MockKubernetesConnector) InstallOperator(ctx context.Context, req InstallOperatorRequest) error {
	ret := _m.Called(ctx, req)

	if len(ret) == 0 {
		panic("no return value specified for InstallOperator")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, InstallOperatorRequest) error); ok {
		r0 = rf(ctx, req)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// InstallPerconaCatalog provides a mock function with given fields: ctx, _a1
func (_m *MockKubernetesConnector) InstallPerconaCatalog(ctx context.Context, _a1 *version.Version) error {
	ret := _m.Called(ctx, _a1)

	if len(ret) == 0 {
		panic("no return value specified for InstallPerconaCatalog")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, *version.Version) error); ok {
		r0 = rf(ctx, _a1)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// ListClusterServiceVersion provides a mock function with given fields: ctx, namespace
func (_m *MockKubernetesConnector) ListClusterServiceVersion(ctx context.Context, namespace string) (*operatorsv1alpha1.ClusterServiceVersionList, error) {
	ret := _m.Called(ctx, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListClusterServiceVersion")
	}

	var r0 *operatorsv1alpha1.ClusterServiceVersionList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) (*operatorsv1alpha1.ClusterServiceVersionList, error)); ok {
		return rf(ctx, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) *operatorsv1alpha1.ClusterServiceVersionList); ok {
		r0 = rf(ctx, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*operatorsv1alpha1.ClusterServiceVersionList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListEngineDeploymentNames provides a mock function with given fields: ctx, namespace
func (_m *MockKubernetesConnector) ListEngineDeploymentNames(ctx context.Context, namespace string) ([]string, error) {
	ret := _m.Called(ctx, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListEngineDeploymentNames")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) ([]string, error)); ok {
		return rf(ctx, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) []string); ok {
		r0 = rf(ctx, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListSubscriptions provides a mock function with given fields: ctx, namespace
func (_m *MockKubernetesConnector) ListSubscriptions(ctx context.Context, namespace string) (*operatorsv1alpha1.SubscriptionList, error) {
	ret := _m.Called(ctx, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListSubscriptions")
	}

	var r0 *operatorsv1alpha1.SubscriptionList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) (*operatorsv1alpha1.SubscriptionList, error)); ok {
		return rf(ctx, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) *operatorsv1alpha1.SubscriptionList); ok {
		r0 = rf(ctx, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*operatorsv1alpha1.SubscriptionList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Namespace provides a mock function with given fields:
func (_m *MockKubernetesConnector) Namespace() string {
	ret := _m.Called()

	if len(ret) == 0 {
		panic("no return value specified for Namespace")
	}

	var r0 string
	if rf, ok := ret.Get(0).(func() string); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(string)
	}

	return r0
}

// OperatorInstalledVersion provides a mock function with given fields: ctx, namespace, name
func (_m *MockKubernetesConnector) OperatorInstalledVersion(ctx context.Context, namespace string, name string) (*version.Version, error) {
	ret := _m.Called(ctx, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for OperatorInstalledVersion")
	}

	var r0 *version.Version
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*version.Version, error)); ok {
		return rf(ctx, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *version.Version); ok {
		r0 = rf(ctx, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*version.Version)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ProvisionMonitoring provides a mock function with given fields: namespace
func (_m *MockKubernetesConnector) ProvisionMonitoring(namespace string) error {
	ret := _m.Called(namespace)

	if len(ret) == 0 {
		panic("no return value specified for ProvisionMonitoring")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(namespace)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// RestartDeployment provides a mock function with given fields: ctx, name, namespace
func (_m *MockKubernetesConnector) RestartDeployment(ctx context.Context, name string, namespace string) error {
	ret := _m.Called(ctx, name, namespace)

	if len(ret) == 0 {
		panic("no return value specified for RestartDeployment")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, name, namespace)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// RestartOperator provides a mock function with given fields: ctx, name, namespace
func (_m *MockKubernetesConnector) RestartOperator(ctx context.Context, name string, namespace string) error {
	ret := _m.Called(ctx, name, namespace)

	if len(ret) == 0 {
		panic("no return value specified for RestartOperator")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, name, namespace)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// SetJWTToken provides a mock function with given fields: ctx, token
func (_m *MockKubernetesConnector) SetJWTToken(ctx context.Context, token string) error {
	ret := _m.Called(ctx, token)

	if len(ret) == 0 {
		panic("no return value specified for SetJWTToken")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string) error); ok {
		r0 = rf(ctx, token)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateClusterRoleBinding provides a mock function with given fields: ctx, name, namespaces
func (_m *MockKubernetesConnector) UpdateClusterRoleBinding(ctx context.Context, name string, namespaces []string) error {
	ret := _m.Called(ctx, name, namespaces)

	if len(ret) == 0 {
		panic("no return value specified for UpdateClusterRoleBinding")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, []string) error); ok {
		r0 = rf(ctx, name, namespaces)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateClusterServiceVersion provides a mock function with given fields: ctx, csv
func (_m *MockKubernetesConnector) UpdateClusterServiceVersion(ctx context.Context, csv *operatorsv1alpha1.ClusterServiceVersion) (*operatorsv1alpha1.ClusterServiceVersion, error) {
	ret := _m.Called(ctx, csv)

	if len(ret) == 0 {
		panic("no return value specified for UpdateClusterServiceVersion")
	}

	var r0 *operatorsv1alpha1.ClusterServiceVersion
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, *operatorsv1alpha1.ClusterServiceVersion) (*operatorsv1alpha1.ClusterServiceVersion, error)); ok {
		return rf(ctx, csv)
	}
	if rf, ok := ret.Get(0).(func(context.Context, *operatorsv1alpha1.ClusterServiceVersion) *operatorsv1alpha1.ClusterServiceVersion); ok {
		r0 = rf(ctx, csv)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*operatorsv1alpha1.ClusterServiceVersion)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, *operatorsv1alpha1.ClusterServiceVersion) error); ok {
		r1 = rf(ctx, csv)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateDeployment provides a mock function with given fields: ctx, deployment
func (_m *MockKubernetesConnector) UpdateDeployment(ctx context.Context, deployment *v1.Deployment) (*v1.Deployment, error) {
	ret := _m.Called(ctx, deployment)

	if len(ret) == 0 {
		panic("no return value specified for UpdateDeployment")
	}

	var r0 *v1.Deployment
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, *v1.Deployment) (*v1.Deployment, error)); ok {
		return rf(ctx, deployment)
	}
	if rf, ok := ret.Get(0).(func(context.Context, *v1.Deployment) *v1.Deployment); ok {
		r0 = rf(ctx, deployment)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1.Deployment)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, *v1.Deployment) error); ok {
		r1 = rf(ctx, deployment)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpgradeOperator provides a mock function with given fields: ctx, namespace, name
func (_m *MockKubernetesConnector) UpgradeOperator(ctx context.Context, namespace string, name string) error {
	ret := _m.Called(ctx, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for UpgradeOperator")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, namespace, name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// WaitForInstallPlan provides a mock function with given fields: ctx, namespace, operatorName, _a3
func (_m *MockKubernetesConnector) WaitForInstallPlan(ctx context.Context, namespace string, operatorName string, _a3 *version.Version) (*operatorsv1alpha1.InstallPlan, error) {
	ret := _m.Called(ctx, namespace, operatorName, _a3)

	if len(ret) == 0 {
		panic("no return value specified for WaitForInstallPlan")
	}

	var r0 *operatorsv1alpha1.InstallPlan
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *version.Version) (*operatorsv1alpha1.InstallPlan, error)); ok {
		return rf(ctx, namespace, operatorName, _a3)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *version.Version) *operatorsv1alpha1.InstallPlan); ok {
		r0 = rf(ctx, namespace, operatorName, _a3)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*operatorsv1alpha1.InstallPlan)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, *version.Version) error); ok {
		r1 = rf(ctx, namespace, operatorName, _a3)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// WaitForInstallPlanCompleted provides a mock function with given fields: ctx, namespace, name
func (_m *MockKubernetesConnector) WaitForInstallPlanCompleted(ctx context.Context, namespace string, name string) error {
	ret := _m.Called(ctx, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for WaitForInstallPlanCompleted")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, namespace, name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// WaitForRollout provides a mock function with given fields: ctx, name, namespace
func (_m *MockKubernetesConnector) WaitForRollout(ctx context.Context, name string, namespace string) error {
	ret := _m.Called(ctx, name, namespace)

	if len(ret) == 0 {
		panic("no return value specified for WaitForRollout")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, name, namespace)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// WithClient provides a mock function with given fields: c
func (_m *MockKubernetesConnector) WithClient(c client.KubeClientConnector) *Kubernetes {
	ret := _m.Called(c)

	if len(ret) == 0 {
		panic("no return value specified for WithClient")
	}

	var r0 *Kubernetes
	if rf, ok := ret.Get(0).(func(client.KubeClientConnector) *Kubernetes); ok {
		r0 = rf(c)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*Kubernetes)
		}
	}

	return r0
}

// NewMockKubernetesConnector creates a new instance of MockKubernetesConnector. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewMockKubernetesConnector(t interface {
	mock.TestingT
	Cleanup(func())
},
) *MockKubernetesConnector {
	mock := &MockKubernetesConnector{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
