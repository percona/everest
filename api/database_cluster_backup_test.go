// everest
// Copyright (C) 2023 Percona LLC
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

package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/rbac"
	"github.com/percona/everest/pkg/rbac/mocks"
	"github.com/percona/everest/pkg/session"
)

type enforceStrings struct{ subject, resource, action, object string }

func TestListDBCluster_permissions(t *testing.T) {
	t.Parallel()

	err := everestv1alpha1.SchemeBuilder.AddToScheme(scheme.Scheme)
	require.NoError(t, err)
	metav1.AddToGroupVersion(scheme.Scheme, everestv1alpha1.GroupVersion)

	l := zap.NewNop().Sugar()

	testCases := []struct {
		name          string
		apiCall       func(echo.Context, *EverestServer) error
		body          any
		httpMethod    string
		kubeClient    func() kubernetes.KubernetesConnector
		proxyResponse any

		expectedEnforce []enforceStrings
	}{
		{
			name:       "List DB cluster backups",
			httpMethod: http.MethodGet,
			apiCall: func(ctx echo.Context, everest *EverestServer) error {
				return everest.ListDatabaseClusterBackups(ctx, "ns", "my-name")
			},
			proxyResponse: &everestv1alpha1.DatabaseClusterBackupList{
				TypeMeta: metav1.TypeMeta{
					Kind: "database-cluster-backup-list",
				},
				Items: []everestv1alpha1.DatabaseClusterBackup{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "name1",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.DatabaseClusterBackupSpec{
							DBClusterName: "db-cluster-name",
						},
					},
				},
			},

			expectedEnforce: []enforceStrings{
				{"alice", rbac.ResourceBackupStorages, rbac.ActionRead, "ns/name1"},
				{"alice", rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, "ns/db-cluster-name"},
			},
		},
		{
			name:       "Get DB cluster backup",
			httpMethod: http.MethodGet,
			apiCall: func(ctx echo.Context, everest *EverestServer) error {
				return everest.GetDatabaseClusterBackup(ctx, "ns", "my-name")
			},
			kubeClient: func() kubernetes.KubernetesConnector {
				k := kubernetes.NewMockKubernetesConnector(t)
				k.EXPECT().GetDatabaseClusterBackup(mock.Anything, mock.Anything, mock.Anything).Return(
					&everestv1alpha1.DatabaseClusterBackup{
						TypeMeta: metav1.TypeMeta{
							Kind: "database-cluster-backup",
						},
						ObjectMeta: metav1.ObjectMeta{
							Namespace: "ns",
							Name:      "name1",
						},
						Spec: everestv1alpha1.DatabaseClusterBackupSpec{
							DBClusterName: "db-cluster-name",
						},
					}, nil,
				)

				return k
			},

			expectedEnforce: []enforceStrings{
				{"alice", rbac.ResourceBackupStorages, rbac.ActionRead, "ns/name1"},
				{"alice", rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, "ns/db-cluster-name"},
			},
		},
		{
			name:       "Create DB cluster backup",
			httpMethod: http.MethodPost,
			body: &DatabaseClusterBackup{
				Spec: &struct {
					BackupStorageName string "json:\"backupStorageName\""
					DbClusterName     string "json:\"dbClusterName\""
				}{
					BackupStorageName: "name1",
					DbClusterName:     "db-cluster-name",
				},
			},
			apiCall: func(ctx echo.Context, everest *EverestServer) error {
				return everest.CreateDatabaseClusterBackup(ctx, "ns")
			},
			proxyResponse: &everestv1alpha1.DatabaseClusterBackup{},
			kubeClient: func() kubernetes.KubernetesConnector {
				k := kubernetes.NewMockKubernetesConnector(t)
				k.EXPECT().GetDatabaseCluster(mock.Anything, mock.Anything, mock.Anything).Return(
					&everestv1alpha1.DatabaseCluster{
						Spec: everestv1alpha1.DatabaseClusterSpec{
							Engine: everestv1alpha1.Engine{
								Type: everestv1alpha1.DatabaseEnginePXC,
							},
						},
					}, nil,
				)
				k.EXPECT().ListDatabaseClusterBackups(mock.Anything, mock.Anything, mock.Anything).Return(
					&everestv1alpha1.DatabaseClusterBackupList{
						Items: []everestv1alpha1.DatabaseClusterBackup{},
					}, nil,
				)

				return k
			},

			expectedEnforce: []enforceStrings{
				{"alice", rbac.ResourceBackupStorages, rbac.ActionRead, "ns/name1"},
				{"alice", rbac.ResourceDatabaseClusterBackups, rbac.ActionCreate, "ns/db-cluster-name"},
			},
		},
	}

	for _, tt := range testCases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			enforcer := &mocks.IEnforcer{}
			kp := newMockK8sProxier(t)
			if tt.proxyResponse != nil {
				kp.EXPECT().proxyKubernetes(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
					Run(func(
						ctx echo.Context, namespace, kind, name string,
						respTransformers ...apiResponseTransformerFn,
					) {
						b, err := json.Marshal(tt.proxyResponse)
						require.NoError(t, err)

						resp := &http.Response{
							Body:   io.NopCloser(bytes.NewReader(b)),
							Header: make(http.Header),
						}

						modify := modifiersFn(l, respTransformers...)
						err = modify(resp)
						require.NoError(t, err)
					}).Return(nil).Once()
			}

			for _, e := range tt.expectedEnforce {
				enforcer.EXPECT().Enforce(e.subject, e.resource, e.action, e.object).Return(true, nil)
			}

			everest := &EverestServer{
				rbacEnforcer: enforcer,
				l:            l,
				k8sProxier:   kp,
			}
			if tt.kubeClient != nil {
				everest.kubeClient = tt.kubeClient()
			}

			var body io.Reader
			if tt.body != nil {
				b, err := json.Marshal(tt.body)
				require.NoError(t, err)
				body = bytes.NewReader(b)
			}

			req, err := http.NewRequest(tt.httpMethod, "/", body)
			require.NoError(t, err)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			e := echo.New()
			c := e.NewContext(req, rec)
			claims := make(jwt.MapClaims)
			claims["sub"] = "alice"
			claims["iss"] = session.SessionManagerClaimsIssuer

			c.Set("user", &jwt.Token{Claims: claims})

			err = tt.apiCall(c, everest)
			require.NoError(t, err)
		})
	}
}
