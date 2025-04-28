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
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	k8sError "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	fakeclient "sigs.k8s.io/controller-runtime/pkg/client/fake"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes"
)

func TestValidate_UpdatePodSchedulingPolicy(t *testing.T) {
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
						Name: "everest-default-pxc",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-postgresql",
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-psmdb",
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
						Name: "everest-default-pxc",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-postgresql",
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-psmdb",
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "used-policy",
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
						Name: "everest-default-pxc",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-postgresql",
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "everest-default-psmdb",
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name: "unused-policy",
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
