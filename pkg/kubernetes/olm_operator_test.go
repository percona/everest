//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package operator contains logic related to kubernetes operators.
package kubernetes

import (
	"context"
	"testing"

	v1 "github.com/operator-framework/api/pkg/operators/v1"
	"github.com/operator-framework/api/pkg/operators/v1alpha1"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/percona/everest/pkg/kubernetes/client"
)

//nolint:paralleltest
func TestInstallOlmOperator(t *testing.T) {
	ctx := context.Background()
	k8sclient := &client.MockKubeClientConnector{}

	l, err := zap.NewDevelopment()
	require.NoError(t, err)

	olms := NewEmpty(l.Sugar())
	olms.client = k8sclient

	//nolint:paralleltest
	t.Run("Install PSMDB Operator", func(t *testing.T) {
		// Install PSMDB Operator
		subscriptionNamespace := "default"
		operatorGroup := "percona-operators-group"
		catalogSource := "operatorhubio-catalog"
		catalogSourceNamespace := "everest-olm"
		operatorName := "percona-server-mongodb-operator"
		params := InstallOperatorRequest{
			Namespace:              subscriptionNamespace,
			Name:                   operatorName,
			OperatorGroup:          operatorGroup,
			CatalogSource:          catalogSource,
			CatalogSourceNamespace: catalogSourceNamespace,
			Channel:                "stable",
			InstallPlanApproval:    v1alpha1.ApprovalManual,
		}

		k8sclient.On("GetOperatorGroup", mock.Anything, subscriptionNamespace, operatorGroup).Return(&v1.OperatorGroup{}, nil)
		mockSubscription := &v1alpha1.Subscription{
			Status: v1alpha1.SubscriptionStatus{
				InstallPlanRef: &corev1.ObjectReference{
					Name: "abcd1234",
				},
			},
		}
		groupResource := schema.GroupResource{
			Group:    "operators.coreos.com",
			Resource: "subscriptions",
		}
		k8sclient.On("DoRolloutWait", ctx, mock.Anything).Return(nil)
		k8sclient.On("GetSubscription", mock.Anything, subscriptionNamespace, operatorName).Return(&v1alpha1.Subscription{}, apierrors.NewNotFound(groupResource, operatorName)).Once()
		k8sclient.On(
			"CreateSubscription",
			mock.Anything, subscriptionNamespace, mock.IsType(&v1alpha1.Subscription{}),
		).Return(mockSubscription, nil)
		k8sclient.On("GetSubscription", mock.Anything, subscriptionNamespace, operatorName).Return(mockSubscription, nil).Once()
		mockInstallPlan := &v1alpha1.InstallPlan{}
		k8sclient.On(
			"GetInstallPlan", mock.Anything,
			subscriptionNamespace, mockSubscription.Status.InstallPlanRef.Name,
		).Return(mockInstallPlan, nil)
		k8sclient.On("UpdateInstallPlan", mock.Anything, subscriptionNamespace, mockInstallPlan).Return(mockInstallPlan, nil)
		err := olms.InstallOperator(ctx, params)
		require.NoError(t, err)
	})
}
