// Code generated by mockery v2.46.2. DO NOT EDIT.

package handlers

import (
	context "context"

	mock "github.com/stretchr/testify/mock"

	v1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	api "github.com/percona/everest/api"
)

// MockHandler is an autogenerated mock type for the Handler type
type MockHandler struct {
	mock.Mock
}

// ApproveUpgradePlan provides a mock function with given fields: ctx, user, namespace
func (_m *MockHandler) ApproveUpgradePlan(ctx context.Context, user string, namespace string) error {
	ret := _m.Called(ctx, user, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ApproveUpgradePlan")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) error); ok {
		r0 = rf(ctx, user, namespace)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// CreateBackupStorage provides a mock function with given fields: ctx, user, namespace, req
func (_m *MockHandler) CreateBackupStorage(ctx context.Context, user string, namespace string, req *api.CreateBackupStorageParams) (*v1alpha1.BackupStorage, error) {
	ret := _m.Called(ctx, user, namespace, req)

	if len(ret) == 0 {
		panic("no return value specified for CreateBackupStorage")
	}

	var r0 *v1alpha1.BackupStorage
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *api.CreateBackupStorageParams) (*v1alpha1.BackupStorage, error)); ok {
		return rf(ctx, user, namespace, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *api.CreateBackupStorageParams) *v1alpha1.BackupStorage); ok {
		r0 = rf(ctx, user, namespace, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.BackupStorage)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, *api.CreateBackupStorageParams) error); ok {
		r1 = rf(ctx, user, namespace, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateDatabaseCluster provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) CreateDatabaseCluster(ctx context.Context, user string, req *v1alpha1.DatabaseCluster) (*v1alpha1.DatabaseCluster, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for CreateDatabaseCluster")
	}

	var r0 *v1alpha1.DatabaseCluster
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseCluster) (*v1alpha1.DatabaseCluster, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseCluster) *v1alpha1.DatabaseCluster); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseCluster)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseCluster) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateDatabaseClusterBackup provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) CreateDatabaseClusterBackup(ctx context.Context, user string, req *v1alpha1.DatabaseClusterBackup) (*v1alpha1.DatabaseClusterBackup, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for CreateDatabaseClusterBackup")
	}

	var r0 *v1alpha1.DatabaseClusterBackup
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterBackup) (*v1alpha1.DatabaseClusterBackup, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterBackup) *v1alpha1.DatabaseClusterBackup); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterBackup)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseClusterBackup) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateDatabaseClusterRestore provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *v1alpha1.DatabaseClusterRestore) (*v1alpha1.DatabaseClusterRestore, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for CreateDatabaseClusterRestore")
	}

	var r0 *v1alpha1.DatabaseClusterRestore
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) (*v1alpha1.DatabaseClusterRestore, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) *v1alpha1.DatabaseClusterRestore); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterRestore)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CreateMonitoringInstance provides a mock function with given fields: ctx, user, namespace, req
func (_m *MockHandler) CreateMonitoringInstance(ctx context.Context, user string, namespace string, req *api.CreateMonitoringInstanceJSONRequestBody) (*v1alpha1.MonitoringConfig, error) {
	ret := _m.Called(ctx, user, namespace, req)

	if len(ret) == 0 {
		panic("no return value specified for CreateMonitoringInstance")
	}

	var r0 *v1alpha1.MonitoringConfig
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *api.CreateMonitoringInstanceJSONRequestBody) (*v1alpha1.MonitoringConfig, error)); ok {
		return rf(ctx, user, namespace, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, *api.CreateMonitoringInstanceJSONRequestBody) *v1alpha1.MonitoringConfig); ok {
		r0 = rf(ctx, user, namespace, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.MonitoringConfig)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, *api.CreateMonitoringInstanceJSONRequestBody) error); ok {
		r1 = rf(ctx, user, namespace, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// DeleteBackupStorage provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) DeleteBackupStorage(ctx context.Context, user string, namespace string, name string) error {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for DeleteBackupStorage")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) error); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteDatabaseCluster provides a mock function with given fields: ctx, user, namespace, name, delReq
func (_m *MockHandler) DeleteDatabaseCluster(ctx context.Context, user string, namespace string, name string, delReq *api.DeleteDatabaseClusterParams) error {
	ret := _m.Called(ctx, user, namespace, name, delReq)

	if len(ret) == 0 {
		panic("no return value specified for DeleteDatabaseCluster")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.DeleteDatabaseClusterParams) error); ok {
		r0 = rf(ctx, user, namespace, name, delReq)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteDatabaseClusterBackup provides a mock function with given fields: ctx, user, namespace, name, req
func (_m *MockHandler) DeleteDatabaseClusterBackup(ctx context.Context, user string, namespace string, name string, req *api.DeleteDatabaseClusterBackupParams) error {
	ret := _m.Called(ctx, user, namespace, name, req)

	if len(ret) == 0 {
		panic("no return value specified for DeleteDatabaseClusterBackup")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.DeleteDatabaseClusterBackupParams) error); ok {
		r0 = rf(ctx, user, namespace, name, req)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteDatabaseClusterRestore provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) DeleteDatabaseClusterRestore(ctx context.Context, user string, namespace string, name string) error {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for DeleteDatabaseClusterRestore")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) error); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteMonitoringInstance provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) DeleteMonitoringInstance(ctx context.Context, user string, namespace string, name string) error {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for DeleteMonitoringInstance")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) error); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// GetBackupStorage provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetBackupStorage(ctx context.Context, user string, namespace string, name string) (*v1alpha1.BackupStorage, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetBackupStorage")
	}

	var r0 *v1alpha1.BackupStorage
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.BackupStorage, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.BackupStorage); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.BackupStorage)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseCluster provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseCluster(ctx context.Context, user string, namespace string, name string) (*v1alpha1.DatabaseCluster, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseCluster")
	}

	var r0 *v1alpha1.DatabaseCluster
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseCluster, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseCluster); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseCluster)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseClusterBackup provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseClusterBackup(ctx context.Context, user string, namespace string, name string) (*v1alpha1.DatabaseClusterBackup, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseClusterBackup")
	}

	var r0 *v1alpha1.DatabaseClusterBackup
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseClusterBackup, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseClusterBackup); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterBackup)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseClusterComponents provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseClusterComponents(ctx context.Context, user string, namespace string, name string) ([]api.DatabaseClusterComponent, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseClusterComponents")
	}

	var r0 []api.DatabaseClusterComponent
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) ([]api.DatabaseClusterComponent, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) []api.DatabaseClusterComponent); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]api.DatabaseClusterComponent)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseClusterCredentials provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseClusterCredentials(ctx context.Context, user string, namespace string, name string) (*api.DatabaseClusterCredential, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseClusterCredentials")
	}

	var r0 *api.DatabaseClusterCredential
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*api.DatabaseClusterCredential, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *api.DatabaseClusterCredential); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.DatabaseClusterCredential)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseClusterPitr provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseClusterPitr(ctx context.Context, user string, namespace string, name string) (*api.DatabaseClusterPitr, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseClusterPitr")
	}

	var r0 *api.DatabaseClusterPitr
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*api.DatabaseClusterPitr, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *api.DatabaseClusterPitr); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.DatabaseClusterPitr)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseClusterRestore provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseClusterRestore(ctx context.Context, user string, namespace string, name string) (*v1alpha1.DatabaseClusterRestore, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseClusterRestore")
	}

	var r0 *v1alpha1.DatabaseClusterRestore
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseClusterRestore, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseClusterRestore); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterRestore)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetDatabaseEngine provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetDatabaseEngine(ctx context.Context, user string, namespace string, name string) (*v1alpha1.DatabaseEngine, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetDatabaseEngine")
	}

	var r0 *v1alpha1.DatabaseEngine
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseEngine, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseEngine); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseEngine)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetKubernetesClusterInfo provides a mock function with given fields: ctx
func (_m *MockHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetKubernetesClusterInfo")
	}

	var r0 *api.KubernetesClusterInfo
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (*api.KubernetesClusterInfo, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) *api.KubernetesClusterInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.KubernetesClusterInfo)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetKubernetesClusterResources provides a mock function with given fields: ctx
func (_m *MockHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetKubernetesClusterResources")
	}

	var r0 *api.KubernetesClusterResources
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (*api.KubernetesClusterResources, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) *api.KubernetesClusterResources); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.KubernetesClusterResources)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetMonitoringInstance provides a mock function with given fields: ctx, user, namespace, name
func (_m *MockHandler) GetMonitoringInstance(ctx context.Context, user string, namespace string, name string) (*v1alpha1.MonitoringConfig, error) {
	ret := _m.Called(ctx, user, namespace, name)

	if len(ret) == 0 {
		panic("no return value specified for GetMonitoringInstance")
	}

	var r0 *v1alpha1.MonitoringConfig
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.MonitoringConfig, error)); ok {
		return rf(ctx, user, namespace, name)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.MonitoringConfig); ok {
		r0 = rf(ctx, user, namespace, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.MonitoringConfig)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, name)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetUpgradePlan provides a mock function with given fields: ctx, user, namespace
func (_m *MockHandler) GetUpgradePlan(ctx context.Context, user string, namespace string) (*api.UpgradePlan, error) {
	ret := _m.Called(ctx, user, namespace)

	if len(ret) == 0 {
		panic("no return value specified for GetUpgradePlan")
	}

	var r0 *api.UpgradePlan
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*api.UpgradePlan, error)); ok {
		return rf(ctx, user, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *api.UpgradePlan); ok {
		r0 = rf(ctx, user, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.UpgradePlan)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, user, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetUserPermissions provides a mock function with given fields: ctx, user
func (_m *MockHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	ret := _m.Called(ctx, user)

	if len(ret) == 0 {
		panic("no return value specified for GetUserPermissions")
	}

	var r0 *api.UserPermissions
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) (*api.UserPermissions, error)); ok {
		return rf(ctx, user)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) *api.UserPermissions); ok {
		r0 = rf(ctx, user)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*api.UserPermissions)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, user)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListBackupStorages provides a mock function with given fields: ctx, user, namespace
func (_m *MockHandler) ListBackupStorages(ctx context.Context, user string, namespace string) (*v1alpha1.BackupStorageList, error) {
	ret := _m.Called(ctx, user, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListBackupStorages")
	}

	var r0 *v1alpha1.BackupStorageList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*v1alpha1.BackupStorageList, error)); ok {
		return rf(ctx, user, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *v1alpha1.BackupStorageList); ok {
		r0 = rf(ctx, user, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.BackupStorageList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, user, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListDatabaseClusterBackups provides a mock function with given fields: ctx, user, namespace, clusterName
func (_m *MockHandler) ListDatabaseClusterBackups(ctx context.Context, user string, namespace string, clusterName string) (*v1alpha1.DatabaseClusterBackupList, error) {
	ret := _m.Called(ctx, user, namespace, clusterName)

	if len(ret) == 0 {
		panic("no return value specified for ListDatabaseClusterBackups")
	}

	var r0 *v1alpha1.DatabaseClusterBackupList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseClusterBackupList, error)); ok {
		return rf(ctx, user, namespace, clusterName)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseClusterBackupList); ok {
		r0 = rf(ctx, user, namespace, clusterName)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterBackupList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, clusterName)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListDatabaseClusterRestores provides a mock function with given fields: ctx, user, namespace, clusterName
func (_m *MockHandler) ListDatabaseClusterRestores(ctx context.Context, user string, namespace string, clusterName string) (*v1alpha1.DatabaseClusterRestoreList, error) {
	ret := _m.Called(ctx, user, namespace, clusterName)

	if len(ret) == 0 {
		panic("no return value specified for ListDatabaseClusterRestores")
	}

	var r0 *v1alpha1.DatabaseClusterRestoreList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) (*v1alpha1.DatabaseClusterRestoreList, error)); ok {
		return rf(ctx, user, namespace, clusterName)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string) *v1alpha1.DatabaseClusterRestoreList); ok {
		r0 = rf(ctx, user, namespace, clusterName)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterRestoreList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string) error); ok {
		r1 = rf(ctx, user, namespace, clusterName)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListDatabaseClusters provides a mock function with given fields: ctx, user, namespace
func (_m *MockHandler) ListDatabaseClusters(ctx context.Context, user string, namespace string) (*v1alpha1.DatabaseClusterList, error) {
	ret := _m.Called(ctx, user, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListDatabaseClusters")
	}

	var r0 *v1alpha1.DatabaseClusterList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*v1alpha1.DatabaseClusterList, error)); ok {
		return rf(ctx, user, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *v1alpha1.DatabaseClusterList); ok {
		r0 = rf(ctx, user, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, user, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListDatabaseEngines provides a mock function with given fields: ctx, user, namespace
func (_m *MockHandler) ListDatabaseEngines(ctx context.Context, user string, namespace string) (*v1alpha1.DatabaseEngineList, error) {
	ret := _m.Called(ctx, user, namespace)

	if len(ret) == 0 {
		panic("no return value specified for ListDatabaseEngines")
	}

	var r0 *v1alpha1.DatabaseEngineList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*v1alpha1.DatabaseEngineList, error)); ok {
		return rf(ctx, user, namespace)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *v1alpha1.DatabaseEngineList); ok {
		r0 = rf(ctx, user, namespace)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseEngineList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, user, namespace)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListMonitoringInstances provides a mock function with given fields: ctx, user, namespaces
func (_m *MockHandler) ListMonitoringInstances(ctx context.Context, user string, namespaces string) (*v1alpha1.MonitoringConfigList, error) {
	ret := _m.Called(ctx, user, namespaces)

	if len(ret) == 0 {
		panic("no return value specified for ListMonitoringInstances")
	}

	var r0 *v1alpha1.MonitoringConfigList
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) (*v1alpha1.MonitoringConfigList, error)); ok {
		return rf(ctx, user, namespaces)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) *v1alpha1.MonitoringConfigList); ok {
		r0 = rf(ctx, user, namespaces)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.MonitoringConfigList)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, user, namespaces)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// ListNamespaces provides a mock function with given fields: ctx, user
func (_m *MockHandler) ListNamespaces(ctx context.Context, user string) ([]string, error) {
	ret := _m.Called(ctx, user)

	if len(ret) == 0 {
		panic("no return value specified for ListNamespaces")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string) ([]string, error)); ok {
		return rf(ctx, user)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) []string); ok {
		r0 = rf(ctx, user)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) error); ok {
		r1 = rf(ctx, user)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// SetNext provides a mock function with given fields: h
func (_m *MockHandler) SetNext(h Handler) {
	_m.Called(h)
}

// UpdateBackupStorage provides a mock function with given fields: ctx, user, name, namespace, req
func (_m *MockHandler) UpdateBackupStorage(ctx context.Context, user string, name string, namespace string, req *api.UpdateBackupStorageParams) (*v1alpha1.BackupStorage, error) {
	ret := _m.Called(ctx, user, name, namespace, req)

	if len(ret) == 0 {
		panic("no return value specified for UpdateBackupStorage")
	}

	var r0 *v1alpha1.BackupStorage
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.UpdateBackupStorageParams) (*v1alpha1.BackupStorage, error)); ok {
		return rf(ctx, user, name, namespace, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.UpdateBackupStorageParams) *v1alpha1.BackupStorage); ok {
		r0 = rf(ctx, user, name, namespace, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.BackupStorage)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string, *api.UpdateBackupStorageParams) error); ok {
		r1 = rf(ctx, user, name, namespace, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateDatabaseCluster provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) UpdateDatabaseCluster(ctx context.Context, user string, req *v1alpha1.DatabaseCluster) (*v1alpha1.DatabaseCluster, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for UpdateDatabaseCluster")
	}

	var r0 *v1alpha1.DatabaseCluster
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseCluster) (*v1alpha1.DatabaseCluster, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseCluster) *v1alpha1.DatabaseCluster); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseCluster)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseCluster) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateDatabaseClusterRestore provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *v1alpha1.DatabaseClusterRestore) (*v1alpha1.DatabaseClusterRestore, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for UpdateDatabaseClusterRestore")
	}

	var r0 *v1alpha1.DatabaseClusterRestore
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) (*v1alpha1.DatabaseClusterRestore, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) *v1alpha1.DatabaseClusterRestore); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseClusterRestore)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseClusterRestore) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateDatabaseEngine provides a mock function with given fields: ctx, user, req
func (_m *MockHandler) UpdateDatabaseEngine(ctx context.Context, user string, req *v1alpha1.DatabaseEngine) (*v1alpha1.DatabaseEngine, error) {
	ret := _m.Called(ctx, user, req)

	if len(ret) == 0 {
		panic("no return value specified for UpdateDatabaseEngine")
	}

	var r0 *v1alpha1.DatabaseEngine
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseEngine) (*v1alpha1.DatabaseEngine, error)); ok {
		return rf(ctx, user, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, *v1alpha1.DatabaseEngine) *v1alpha1.DatabaseEngine); ok {
		r0 = rf(ctx, user, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.DatabaseEngine)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, *v1alpha1.DatabaseEngine) error); ok {
		r1 = rf(ctx, user, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateMonitoringInstance provides a mock function with given fields: ctx, user, namespace, name, req
func (_m *MockHandler) UpdateMonitoringInstance(ctx context.Context, user string, namespace string, name string, req *api.UpdateMonitoringInstanceJSONRequestBody) (*v1alpha1.MonitoringConfig, error) {
	ret := _m.Called(ctx, user, namespace, name, req)

	if len(ret) == 0 {
		panic("no return value specified for UpdateMonitoringInstance")
	}

	var r0 *v1alpha1.MonitoringConfig
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.UpdateMonitoringInstanceJSONRequestBody) (*v1alpha1.MonitoringConfig, error)); ok {
		return rf(ctx, user, namespace, name, req)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, *api.UpdateMonitoringInstanceJSONRequestBody) *v1alpha1.MonitoringConfig); ok {
		r0 = rf(ctx, user, namespace, name, req)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*v1alpha1.MonitoringConfig)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string, *api.UpdateMonitoringInstanceJSONRequestBody) error); ok {
		r1 = rf(ctx, user, namespace, name, req)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// NewMockHandler creates a new instance of MockHandler. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewMockHandler(t interface {
	mock.TestingT
	Cleanup(func())
},
) *MockHandler {
	mock := &MockHandler{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
