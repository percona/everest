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

// Package rbac provides RBAC middleware utilies for the Everest API server.
package rbac

import (
	"context"
	"errors"
	"io/fs"
	"slices"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	everestclient "github.com/percona/everest/client"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/informer"
	configmapadapter "github.com/percona/everest/pkg/rbac/configmap-adapter"
	"github.com/percona/everest/pkg/rbac/fileadapter"
	"github.com/percona/everest/pkg/session"
)

// Setup a new informer that watches our RBAC ConfigMap.
// This informer reloads the policy whenever the ConfigMap is updated.
func refreshEnforcerInBackground(
	ctx context.Context,
	kubeClient *kubernetes.Kubernetes,
	enforcer *casbin.Enforcer,
	l *zap.SugaredLogger,
) error {
	inf, err := informer.New(
		informer.WithConfig(kubeClient.Config()),
		informer.WithLogger(l),
		informer.Watches(&corev1.ConfigMap{}, kubeClient.Namespace()),
	)
	inf.OnUpdate(func(_, newObj interface{}) {
		cm, ok := newObj.(*corev1.ConfigMap)
		if !ok || cm.GetName() != common.EverestRBACConfigMapName {
			return
		}
		if err := enforcer.LoadPolicy(); err != nil {
			l.Error("failed to load policy", zap.Error(err))
		}
	})
	if inf.Start(ctx, &corev1.ConfigMap{}) != nil {
		return errors.Join(err, errors.New("failed to watch RBAC ConfigMap"))
	}
	return nil
}

func getModel() (model.Model, error) {
	modelData, err := fs.ReadFile(data.RBAC, "rbac/model.conf")
	if err != nil {
		return nil, errors.Join(err, errors.New("could not read casbin model"))
	}
	return model.NewModelFromString(string(modelData))
}

// NewEnforcer creates a new Casbin enforcer with the RBAC model and ConfigMap adapter.
func NewEnforcer(ctx context.Context, kubeClient *kubernetes.Kubernetes, l *zap.SugaredLogger) (*casbin.Enforcer, error) {
	model, err := getModel()
	if err != nil {
		return nil, err
	}

	cmReq := types.NamespacedName{
		Namespace: common.SystemNamespace,
		Name:      common.EverestRBACConfigMapName,
	}
	adapter := configmapadapter.New(l, kubeClient, cmReq)

	enforcer, err := casbin.NewEnforcer(model, adapter, false)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create casbin enforcer"))
	}
	return enforcer, refreshEnforcerInBackground(ctx, kubeClient, enforcer, l)
}

// NewEnforcerFromFilePath creates a new Casbin enforcer with the policy stored at the given filePath.
func NewEnforcerFromFilePath(filePath string) (*casbin.Enforcer, error) {
	model, err := getModel()
	if err != nil {
		return nil, err
	}
	adapter, err := fileadapter.New(filePath)
	if err != nil {
		return nil, err
	}
	return casbin.NewEnforcer(model, adapter)
}

// GetUser extracts the user from the JWT token in the context.
func GetUser(c echo.Context) (string, error) {
	token, ok := c.Get("user").(*jwt.Token) // by default token is stored under `user` key
	if !ok {
		return "", errors.New("failed to get token from context")
	}

	claims, ok := token.Claims.(jwt.MapClaims) // by default claims is of type `jwt.MapClaims`
	if !ok {
		return "", errors.New("failed to get claims from token")
	}

	subject, err := claims.GetSubject()
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get subject from claims"))
	}

	issuer, err := claims.GetIssuer()
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get issuer from claims"))
	}

	if issuer == session.SessionManagerClaimsIssuer {
		return strings.Split(subject, ":")[0], nil
	}
	return subject, nil
}

// buildPathResourceMap builds a map of paths to resources and a list of resources.
// Returns: (resourceMap, skipPaths, error) .
func buildPathResourceMap(basePath string) (map[string]string, []string, error) {
	swg, err := everestclient.GetSwagger()
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("failed to get swagger"))
	}

	// parseEndpoint replaces the curly braces in the endpoint with colons.
	// example: '/{namespace}/clusters' -> '/:namespace/clusters'
	parseEndpoint := func(ep string) string {
		parsed := strings.ReplaceAll(ep, "{", ":")
		parsed = strings.ReplaceAll(parsed, "}", "")
		return basePath + parsed
	}

	resourceMap := make(map[string]string)
	skipPaths := []string{}
	for path, pathItem := range swg.Paths.Map() {
		parsedPath := parseEndpoint(path)
		if val, ok := pathItem.Extensions[common.EverestAPIExtnResourceName]; ok {
			if resourceName, ok := val.(string); ok {
				resourceMap[parsedPath] = resourceName
			}
			continue
		}
		skipPaths = append(skipPaths, parsedPath)
	}
	return resourceMap, skipPaths, nil
}

// NewEnforceHandler returns a function that checks if a user is allowed to access a resource.
func NewEnforceHandler(basePath string, enforcer *casbin.Enforcer) func(c echo.Context, user string) (bool, error) {
	pathResourceMap, _, err := buildPathResourceMap(basePath)
	if err != nil {
		panic("failed to build path resource map: " + err.Error())
	}
	return func(c echo.Context, user string) (bool, error) {
		actionMethodMap := map[string]string{
			"GET":    "read",
			"POST":   "create",
			"PUT":    "update",
			"PATCH":  "update",
			"DELETE": "delete",
		}
		var resource string
		var object string
		resource, ok := pathResourceMap[c.Path()]
		if !ok {
			return false, errors.New("invalid URL")
		}
		switch resource {
		case "backup-storages", "monitoring-instances":
			object = "*"
		case "database-clusters",
			"database-engines",
			"database-cluster-backups",
			"database-cluster-restores":
			namespace := c.Param("namespace")
			name := c.Param("name")
			object = namespace + "/" + name
		case "namespaces":
			name := c.Param("name")
			object = name
		}

		action, ok := actionMethodMap[c.Request().Method]
		if !ok {
			return false, errors.New("invalid method")
		}
		return enforcer.Enforce(user, resource, action, object)
	}
}

// NewSkipper returns a new function that checks if a given request should be skipped
// from RBAC checks.
func NewSkipper(basePath string) (func(echo.Context) bool, error) {
	_, skipPaths, err := buildPathResourceMap(basePath)
	if err != nil {
		return nil, err
	}
	return func(c echo.Context) bool {
		return slices.Contains(skipPaths, c.Request().URL.Path)
	}, nil
}
