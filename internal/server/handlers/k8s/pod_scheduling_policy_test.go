// everest
// Copyright (C) 2025 Percona LLC
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

package k8s

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	k8sError "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	fakeclient "sigs.k8s.io/controller-runtime/pkg/client/fake"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func TestValidate_DeletePodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name            string
		objs            []ctrlclient.Object
		pspNameToDelete string
		wantErr         error
	}
	testCases := []testCase{
		// no policies
		{
			name:            "no policies",
			pspNameToDelete: "test-policy",
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"test-policy",
			),
		},
		// delete non-existing policy
		{
			name: "delete non-existing policy",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
			},
			pspNameToDelete: "non-existing-policy",
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"non-existing-policy",
			),
		},
		// delete used policy
		{
			name: "delete used policy",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "used-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.DatabaseCluster{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-cluster",
						Namespace: "test-ns",
						Labels: map[string]string{
							kubernetes.PodSchedulingPolicyNameLabel: "used-policy",
						},
					},
				},
			},
			pspNameToDelete: "used-policy",
			wantErr:         errors.New("the pod scheduling poicy='used-policy' is in use. Unassign the policy first"),
		},
		// delete unused policy
		{
			name: "delete unused policy",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "unused-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
			},
			pspNameToDelete: "unused-policy",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			mockClient := fakeclient.NewClientBuilder().
				WithScheme(kubernetes.CreateScheme()).
				WithObjects(tc.objs...).
				Build()
			k := kubernetes.NewEmpty(zap.NewNop().Sugar()).WithKubernetesClient(mockClient)
			k8sH := New(zap.NewNop().Sugar(), k, "")

			err := k8sH.DeletePodSchedulingPolicy(context.Background(), tc.pspNameToDelete)
			if tc.wantErr != nil {
				assert.Equal(t, tc.wantErr.Error(), err.Error())
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestValidate_ListPodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name       string
		objs       []ctrlclient.Object
		listParams *api.ListPodSchedulingPolicyParams
		assert     func(*everestv1alpha1.PodSchedulingPolicyList) bool
		wantErr    error
	}
	testCases := []testCase{
		// policies are absent
		{
			name: "absent policies",
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 0
			},
		},
		// default policies no filter
		{
			name: "default policies without filter",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
				},
			},
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 3 &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-pxc"
					}) &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-postgresql"
					}) &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-psmdb"
					})
			},
		},
		// default policies PXC filter
		{
			name: "default policies PXC filter",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			listParams: &api.ListPodSchedulingPolicyParams{
				EngineType: pointer.To(api.Pxc),
			},
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 1 &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-pxc"
					})
			},
		},
		// default policies PSMDB filter
		{
			name: "default policies PSMDB filter",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			listParams: &api.ListPodSchedulingPolicyParams{
				EngineType: pointer.To(api.Psmdb),
			},
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 1 &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-psmdb"
					})
			},
		},
		// default policies PostgreSQL filter
		{
			name: "default policies PostgreSQL filter",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-pxc",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-postgresql",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:       "everest-default-psmdb",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			listParams: &api.ListPodSchedulingPolicyParams{
				EngineType: pointer.To(api.Postgresql),
			},
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 1 &&
					slices.ContainsFunc(list.Items, func(bs everestv1alpha1.PodSchedulingPolicy) bool {
						return bs.GetName() == "everest-default-postgresql"
					})
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			mockClient := fakeclient.NewClientBuilder().
				WithScheme(kubernetes.CreateScheme()).
				WithObjects(tc.objs...).
				Build()

			k := kubernetes.NewEmpty(zap.NewNop().Sugar()).WithKubernetesClient(mockClient)
			k8sH := New(zap.NewNop().Sugar(), k, "")

			pspList, err := k8sH.ListPodSchedulingPolicies(context.Background(), tc.listParams)
			require.NoError(t, err)
			assert.Condition(t, func() bool {
				return tc.assert(pspList)
			})
		})
	}
}
