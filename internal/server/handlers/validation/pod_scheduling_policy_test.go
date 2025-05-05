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

package validation

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	k8sError "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	fakeclient "sigs.k8s.io/controller-runtime/pkg/client/fake"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/internal/server/handlers/k8s"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/utils"
)

func TestValidate_CreatePodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name           string
		objs           []ctrlclient.Object
		policyToCreate *everestv1alpha1.PodSchedulingPolicy
		wantErr        error
	}

	testCases := []testCase{
		// invalid PodSchedulingPolicy namespace
		{
			name: "empty namespace",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test",
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid namespace '': pod scheduling policy must be in '%s' namespace only", common.SystemNamespace)),
		},
		{
			name: "non everest-system namespace",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test",
					Namespace: "test",
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid namespace 'test': pod scheduling policy must be in '%s' namespace only", common.SystemNamespace)),
		},
		// invalid PodSchedulingPolicy names
		{
			name: "empty podSchedulingPolicy name",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "",
					Namespace: common.SystemNamespace,
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, utils.ErrNameNotRFC1035Compatible("metadata.name")),
		},
		{
			name: "name starts with -",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "-rstrst",
					Namespace: common.SystemNamespace,
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, utils.ErrNameNotRFC1035Compatible("metadata.name")),
		},
		{
			name: "name ends with -",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "rstrst-",
					Namespace: common.SystemNamespace,
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, utils.ErrNameNotRFC1035Compatible("metadata.name")),
		},
		{
			name: "name contains uppercase",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "AAsdf",
					Namespace: common.SystemNamespace,
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, utils.ErrNameNotRFC1035Compatible("metadata.name")),
		},
		{
			name: "name too long",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "asldkafaslkdjfalskdfjaslkdjflsakfjdalskfdjaslkfdjaslkfdjsaklfdassksjdfhskdjfskjdfsdfsdflasdkfasdfk",
					Namespace: common.SystemNamespace,
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, utils.ErrNameNotRFC1035Compatible("metadata.name")),
		},
		{
			name: "duplicate name",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "everest-existing-name",
						Namespace: common.SystemNamespace,
					},
				},
			},
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "everest-existing-name",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-existing-name' already exists")),
		},
		// unsupported engineType
		{
			name: "unsupported engineType",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "unknown-engine-type",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: "unsupported",
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("unsupported .spec.engineType='unsupported'")),
		},
		// empty affinity configs
		{
			name: "empty pxc affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-affinity",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType:     everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.pxc is required")),
		},
		{
			name: "empty psmdb affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-affinity",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType:     everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.psmdb is required")),
		},
		{
			name: "empty postgresql affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-affinity",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType:     everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.postgresql is required")),
		},
		// empty DB components affinity configs
		{
			name: "empty PXC components config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-pxc-components",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.pxc.engine or .spec.affinityConfig.pxc.proxy is required")),
		},
		{
			name: "empty PSMDB components config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-psmdb-components",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.psmdb.engine or .spec.affinityConfig.psmdb.proxy or .spec.affinityConfig.psmdb.configServer is required")),
		},
		{
			name: "empty PostgreSQL components config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "empty-pg-components",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("invalid affinity config: .spec.affinityConfig.postgresql.engine or .spec.affinityConfig.postgresql.proxy is required")),
		},
		// affinity config mismatches with engineType
		{
			name: "PXC affinity config mismatch PSMDB",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pxc-mismatch-psmdb",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)),
		},
		{
			name: "PXC affinity config mismatch PostgreSQL",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pxc-mismatch-pg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)),
		},
		{
			name: "PSMDB affinity config mismatch PXC",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "psmdb-mismatch-pxc",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{},
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)),
		},
		{
			name: "PSMDB affinity config mismatch PosgreSQL",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "psmdb-mismatch-pg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{},
						},
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)),
		},
		{
			name: "PostgreSQL affinity config mismatch PXC",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pg-mismatch-pxc",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{},
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)),
		},
		{
			name: "PostgreSQL affinity config mismatch PSMDB",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pg-mismatch-psmdb",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{},
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)),
		},
		// valid simple cases
		{
			name: "PXC valid simple affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pxc-valid-simple-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "PSMDB valid simple affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "psmdb-valid-simple-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "PostgreSQL valid simple affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pg-valid-simple-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		// valid cases with full affinity config
		{
			name: "PXC valid full affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pxc-valid-full-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "PSMDB valid full affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "psmdb-valid-full-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "PostgreSQL valid full affinity config",
			policyToCreate: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pg-valid-full-cfg",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
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
			k8sHandler := k8s.New(zap.NewNop().Sugar(), k, "")

			valHandler := New(zap.NewNop().Sugar(), k)
			valHandler.SetNext(k8sHandler)
			_, err := valHandler.CreatePodSchedulingPolicy(context.Background(), tc.policyToCreate)
			if tc.wantErr == nil {
				require.NoError(t, err)
				return
			}
			assert.Equal(t, tc.wantErr.Error(), err.Error())
		})
	}
}

func TestValidate_ListPodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name    string
		objs    []ctrlclient.Object
		assert  func(*everestv1alpha1.PodSchedulingPolicyList) bool
		wantErr error
	}

	testCases := []testCase{
		// policies are absent
		{
			name: "absent policies",
			assert: func(list *everestv1alpha1.PodSchedulingPolicyList) bool {
				return len(list.Items) == 0
			},
		},
		// default policies
		{
			name: "default policies",
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
						Name:      "everest-default-postgresql",
						Namespace: common.SystemNamespace,
					},
				},
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "everest-default-psmdb",
						Namespace: common.SystemNamespace,
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
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			mockClient := fakeclient.NewClientBuilder().
				WithScheme(kubernetes.CreateScheme()).
				WithObjects(tc.objs...).
				Build()
			k := kubernetes.NewEmpty(zap.NewNop().Sugar()).WithKubernetesClient(mockClient)
			k8sHandler := k8s.New(zap.NewNop().Sugar(), k, "")

			valHandler := New(zap.NewNop().Sugar(), k)
			valHandler.SetNext(k8sHandler)
			pspList, err := valHandler.ListPodSchedulingPolicies(context.Background(), nil)
			require.NoError(t, err)
			assert.Condition(t, func() bool {
				return tc.assert(pspList)
			})
		})
	}
}

func TestValidate_GetPodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name       string
		objs       []ctrlclient.Object
		policyName string
		wantPolicy *everestv1alpha1.PodSchedulingPolicy
		wantErr    error
	}

	testCases := []testCase{
		// policies are absent
		{
			name:       "no policies",
			policyName: "everest-default-pxc",
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"everest-default-pxc",
			),
		},
		// get default policy
		{
			name: "get default policy",
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
			policyName: "everest-default-pxc",
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:       "everest-default-pxc",
					Namespace:  common.SystemNamespace,
					Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{},
			},
		},
		// get absent policy
		{
			name: "get absent policy",
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
			policyName: "non-existing-policy",
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"non-existing-policy",
			),
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
			k8sHandler := k8s.New(zap.NewNop().Sugar(), k, "")

			valHandler := New(zap.NewNop().Sugar(), k)
			valHandler.SetNext(k8sHandler)
			psp, err := valHandler.GetPodSchedulingPolicy(context.Background(), tc.policyName)
			if tc.wantErr != nil {
				assert.Equal(t, tc.wantErr.Error(), err.Error())
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantPolicy.GetName(), psp.GetName())
		})
	}
}

func TestValidate_UpdatePodSchedulingPolicy(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name          string
		objs          []ctrlclient.Object
		updatedPolicy *everestv1alpha1.PodSchedulingPolicy
		wantPolicy    *everestv1alpha1.PodSchedulingPolicy
		wantErr       error
	}

	testCases := []testCase{
		// invalid PodSchedulingPolicy namespace
		{
			name: "empty namespace",
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test",
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid namespace '': pod scheduling policy must be in '%s' namespace only", common.SystemNamespace)),
		},
		{
			name: "non everest-system namespace",
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test",
					Namespace: "test",
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid namespace 'test': pod scheduling policy must be in '%s' namespace only", common.SystemNamespace)),
		},
		// policies are absent
		{
			name: "no policies",
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
				},
			},
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"test-policy",
			),
		},
		// update non-existing policy
		{
			name: "update non-existing policy",
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
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "non-existing-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: k8sError.NewNotFound(schema.GroupResource{
				Group:    everestv1alpha1.GroupVersion.Group,
				Resource: "podschedulingpolicies",
			},
				"non-existing-policy",
			),
		},
		// update default policy PXC
		{
			name: "update default PXC policy",
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
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:       "everest-default-pxc",
					Namespace:  common.SystemNamespace,
					Finalizers: []string{everestv1alpha1.ReadOnlyFinalizer},
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-pxc' is default and cannot be updated")),
		},
		// update default policy PSMDB
		{
			name: "update default PSMDB policy",
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
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "everest-default-psmdb",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-psmdb' is default and cannot be updated")),
		},
		// update default policy PostgreSQL
		{
			name: "update default PosgreSQL policy",
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
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "everest-default-postgresql",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-postgresql' is default and cannot be updated")),
		},
		// affinity config mismatches with engineType
		{
			name: "PXC affinity config mismatch PSMDB",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)),
		},
		{
			name: "PXC affinity config mismatch PostgreSQL",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)),
		},
		{
			name: "PSMDB affinity config mismatch PXC",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)),
		},
		{
			name: "PSMDB affinity config mismatch PosgreSQL",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)),
		},
		{
			name: "PostgreSQL affinity config mismatch PXC",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)),
		},
		{
			name: "PostgreSQL affinity config mismatch PSMDB",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-policy",
					Namespace: common.SystemNamespace,
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{},
						},
					},
				},
			},
			wantErr: errors.Join(ErrInvalidRequest, fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)),
		},
		// valid update - add full affinity config
		{
			name: "valid update PXC - add full affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pxc",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PSMDB - add full affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-psmdb",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PosgreSQL - add full affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pg",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		// valid update - add a DB component into affinity config
		{
			name: "valid update PXC - add db component into affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pxc",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PXC: &everestv1alpha1.PXCAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PSMDB - add db component into affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-psmdb",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PosgreSQL - add db component into affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pg",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Engine: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		// valid update - replace a DB component in affinity config
		{
			name: "valid update PXC - replace db component in affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pxc",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePXC,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PXC: &everestv1alpha1.PXCAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pxc",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePXC,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PXC: &everestv1alpha1.PXCAffinityConfig{
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PSMDB - replace db component in affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-psmdb",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePSMDB,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-psmdb",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePSMDB,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PSMDB: &everestv1alpha1.PSMDBAffinityConfig{
							ConfigServer: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "valid update PosgreSQL - replace db component in affinity config",
			objs: []ctrlclient.Object{
				&everestv1alpha1.PodSchedulingPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:            "valid-update-pg",
						Namespace:       common.SystemNamespace,
						ResourceVersion: "1",
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{
						EngineType: everestv1alpha1.DatabaseEnginePostgresql,
						AffinityConfig: &everestv1alpha1.AffinityConfig{
							PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
								Engine: &corev1.Affinity{
									PodAntiAffinity: &corev1.PodAntiAffinity{
										RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
											{
												TopologyKey: "kubernetes.io/hostname",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			updatedPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "1",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
			},
			wantPolicy: &everestv1alpha1.PodSchedulingPolicy{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "valid-update-pg",
					Namespace:       common.SystemNamespace,
					ResourceVersion: "2",
				},
				Spec: everestv1alpha1.PodSchedulingPolicySpec{
					EngineType: everestv1alpha1.DatabaseEnginePostgresql,
					AffinityConfig: &everestv1alpha1.AffinityConfig{
						PostgreSQL: &everestv1alpha1.PostgreSQLAffinityConfig{
							Proxy: &corev1.Affinity{
								PodAntiAffinity: &corev1.PodAntiAffinity{
									RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
										{
											TopologyKey: "kubernetes.io/hostname",
										},
									},
								},
							},
						},
					},
				},
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
			k8sHandler := k8s.New(zap.NewNop().Sugar(), k, "")

			valHandler := New(zap.NewNop().Sugar(), k)
			valHandler.SetNext(k8sHandler)

			psp, err := valHandler.UpdatePodSchedulingPolicy(context.Background(), tc.updatedPolicy.GetName(), tc.updatedPolicy)
			if tc.wantErr != nil {
				assert.Equal(t, tc.wantErr.Error(), err.Error())
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.wantPolicy, psp)
		})
	}
}

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
		// delete default PXC policy
		{
			name: "delete default PXC policy",
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
			pspNameToDelete: "everest-default-pxc",
			wantErr:         errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-pxc' is default and cannot be deleted")),
		},
		// delete default PSMDB policy
		{
			name: "delete default PSMDB policy",
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
			pspNameToDelete: "everest-default-psmdb",
			wantErr:         errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-psmdb' is default and cannot be deleted")),
		},
		// delete default PostgreSQL policy
		{
			name: "delete default PostgreSQL policy",
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
			pspNameToDelete: "everest-default-postgresql",
			wantErr:         errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='everest-default-postgresql' is default and cannot be deleted")),
		},
		// delete non-used policy
		{
			name: "delete non-used policy",
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
						Name:      "test-policy",
						Namespace: common.SystemNamespace,
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
			},
			pspNameToDelete: "test-policy",
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
						Name:       "test-policy",
						Namespace:  common.SystemNamespace,
						Finalizers: []string{everestv1alpha1.UsedResourceFinalizer},
					},
					Spec: everestv1alpha1.PodSchedulingPolicySpec{},
				},
			},
			pspNameToDelete: "test-policy",
			wantErr:         errors.Join(ErrInvalidRequest, errors.New("pod scheduling policy with name='test-policy' is used by some DB cluster and cannot be deleted")),
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
			k8sHandler := k8s.New(zap.NewNop().Sugar(), k, "")

			valHandler := New(zap.NewNop().Sugar(), k)
			valHandler.SetNext(k8sHandler)

			err := valHandler.DeletePodSchedulingPolicy(context.Background(), tc.pspNameToDelete)
			if tc.wantErr != nil {
				assert.Equal(t, tc.wantErr.Error(), err.Error())
				return
			}
			require.NoError(t, err)
		})
	}
}
