package utils

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func TestCheckHelmInstallation(t *testing.T) {
	t.Parallel()

	c := &kubernetes.MockKubernetesConnector{}
	testCases := []struct {
		everestVersion string
		wantErr        bool
	}{
		{
			everestVersion: "1.4.0",
			wantErr:        false,
		},
		{
			everestVersion: "1.4.0-rc3",
			wantErr:        false,
		},
		{
			everestVersion: "1.3.0",
			wantErr:        true,
		},
		{
			everestVersion: "0.0.0",
			wantErr:        false,
		},
	}

	ctx := context.Background()
	for _, tc := range testCases {
		mockCall := c.On("GetDeployment",
			mock.Anything,
			mock.Anything,
			mock.Anything,
		).
			Return(getDeployment(tc.everestVersion), nil)

		v, err := CheckHelmInstallation(ctx, c)
		if tc.wantErr {
			require.Error(t, err)
		} else {
			require.NoError(t, err)
			assert.Equal(t, tc.everestVersion, v)
		}
		mockCall.Unset()
	}
}

func getDeployment(v string) *appsv1.Deployment {
	return &appsv1.Deployment{
		Spec: appsv1.DeploymentSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  common.EverestContainerNameInDeployment,
							Image: "percona/everest:v" + v,
						},
					},
				},
			},
		},
	}
}
