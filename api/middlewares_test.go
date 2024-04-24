// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package api

import (
	"net/http"
	"net/url"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/client"
)

func TestShouldAllowRequestDuringEngineUpgrade(t *testing.T) {
	t.Parallel()
	testCases := []struct {
		description string
		mockFn      func(m *client.MockKubeClientConnector)
		ctxFn       func() echo.Context
		allow       bool
	}{
		{
			description: "allow all GET requests",
			ctxFn: func() echo.Context {
				return echo.New().NewContext(&http.Request{
					Method: http.MethodGet,
				}, nil,
				)
			},
			allow: true,
		},
		{
			description: "allow non-target paths",
			ctxFn: func() echo.Context {
				return echo.New().NewContext(&http.Request{
					Method: http.MethodPost,
					URL: &url.URL{
						Path: "/api/v1/namespaces/default/monitoring-instances",
					},
				}, nil,
				)
			},
			allow: true,
		},
		{
			description: "allow target paths with no namespace",
			ctxFn: func() echo.Context {
				return echo.New().NewContext(&http.Request{
					Method: http.MethodPost,
					URL: &url.URL{
						Path: "/api/v1/database-clusters",
					},
				}, nil,
				)
			},
			allow: true,
		},
		{
			description: "allow target path with no ongoing upgrades",
			ctxFn: func() echo.Context {
				ctx := echo.New().NewContext(&http.Request{
					Method: http.MethodDelete,
					URL: &url.URL{
						Path: "/api/v1/namespaces/default/database-clusters/1234",
					},
				}, nil,
				)
				ctx.SetParamNames("namespace")
				ctx.SetParamValues("default")
				return ctx
			},
			mockFn: func(m *client.MockKubeClientConnector) {
				m.On("ListDatabaseEngines",
					mock.Anything,
					"default",
				).
					Return(&everestv1alpha1.DatabaseEngineList{
						Items: []everestv1alpha1.DatabaseEngine{
							{
								ObjectMeta: metav1.ObjectMeta{
									Name:      "test-engine",
									Namespace: "default",
								},
								Spec: everestv1alpha1.DatabaseEngineSpec{},
								Status: everestv1alpha1.DatabaseEngineStatus{
									State: everestv1alpha1.DBEngineStateInstalled,
								},
							},
						},
					}, nil,
					)
			},
			allow: true,
		},
		{
			description: "deny request on target path with ongoing upgrades",
			ctxFn: func() echo.Context {
				ctx := echo.New().NewContext(&http.Request{
					Method: http.MethodDelete,
					URL: &url.URL{
						Path: "/api/v1/namespaces/default/database-clusters/1234",
					},
				}, nil,
				)
				ctx.SetParamNames("namespace")
				ctx.SetParamValues("default")
				return ctx
			},
			mockFn: func(m *client.MockKubeClientConnector) {
				m.On("ListDatabaseEngines",
					mock.Anything, "default",
				).
					Return(&everestv1alpha1.DatabaseEngineList{
						Items: []everestv1alpha1.DatabaseEngine{
							{
								ObjectMeta: metav1.ObjectMeta{
									Name:      "test-engine",
									Namespace: "default",
								},
								Spec: everestv1alpha1.DatabaseEngineSpec{},
								Status: everestv1alpha1.DatabaseEngineStatus{
									State: everestv1alpha1.DBEngineStateUpgrading,
								},
							},
						},
					}, nil,
					)
			},
			allow: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			t.Parallel()
			mockConnector := &client.MockKubeClientConnector{}
			kubeClient := &kubernetes.Kubernetes{}
			kubeClient = kubeClient.WithClient(mockConnector)

			e := EverestServer{kubeClient: kubeClient}

			if tc.mockFn != nil {
				tc.mockFn(mockConnector)
			}

			ctx := tc.ctxFn()

			allow, err := e.shouldAllowRequestDuringEngineUpgrade(ctx)
			require.NoError(t, err)
			assert.Equal(t, tc.allow, allow)
		})
	}
}
