// Code generated by mockery v2.52.3. DO NOT EDIT.

package versionservice

import (
	context "context"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	mock "github.com/stretchr/testify/mock"
)

// MockInterface is an autogenerated mock type for the Interface type
type MockInterface struct {
	mock.Mock
}

// GetEverestMetadata provides a mock function with given fields: ctx
func (_m *MockInterface) GetEverestMetadata(ctx context.Context) (*version.MetadataResponse, error) {
	ret := _m.Called(ctx)

	if len(ret) == 0 {
		panic("no return value specified for GetEverestMetadata")
	}

	var r0 *version.MetadataResponse
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context) (*version.MetadataResponse, error)); ok {
		return rf(ctx)
	}
	if rf, ok := ret.Get(0).(func(context.Context) *version.MetadataResponse); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*version.MetadataResponse)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetSupportedEngineVersions provides a mock function with given fields: ctx, operator, _a2
func (_m *MockInterface) GetSupportedEngineVersions(ctx context.Context, operator string, _a2 string) ([]string, error) {
	ret := _m.Called(ctx, operator, _a2)

	if len(ret) == 0 {
		panic("no return value specified for GetSupportedEngineVersions")
	}

	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) ([]string, error)); ok {
		return rf(ctx, operator, _a2)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) []string); ok {
		r0 = rf(ctx, operator, _a2)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, operator, _a2)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// NewMockInterface creates a new instance of MockInterface. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewMockInterface(t interface {
	mock.TestingT
	Cleanup(func())
},
) *MockInterface {
	mock := &MockInterface{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
