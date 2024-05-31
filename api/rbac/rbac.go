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

	configmapadapter "github.com/percona/everest/api/rbac/configmap-adapter"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/informer"
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

// NewEnforcer creates a new Casbin enforcer with the RBAC model and ConfigMap adapter.
func NewEnforcer(ctx context.Context, kubeClient *kubernetes.Kubernetes, l *zap.SugaredLogger) (*casbin.Enforcer, error) {
	modelData, err := fs.ReadFile(data.RBAC, "rbac/model.conf")
	if err != nil {
		return nil, errors.Join(err, errors.New("could not read casbin model"))
	}

	model, err := model.NewModelFromString(string(modelData))
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create casbin model"))
	}

	cmReq := types.NamespacedName{
		Namespace: kubeClient.Namespace(),
		Name:      common.EverestRBACConfigMapName,
	}
	adapter := configmapadapter.NewAdapter(kubeClient, cmReq)

	enforcer, err := casbin.NewEnforcer(model, adapter, true)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create casbin enforcer"))
	}

	return enforcer, refreshEnforcerInBackground(ctx, kubeClient, enforcer, l)
}

// UserGetter is a function that extracts the user from the JWT token.
func UserGetter(c echo.Context) (string, error) {
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

// NewEnforceHandler returns a function that checks if a user is allowed to access a resource.
func NewEnforceHandler(basePath string, enforcer *casbin.Enforcer) func(c echo.Context, user string) (bool, error) {
	return func(c echo.Context, user string) (bool, error) {
		pathResourceMap := map[string]string{
			basePath + "/backup-storages":                                           "backup-storages",
			basePath + "/backup-storages/:name":                                     "backup-storages",
			basePath + "/monitoring-instances":                                      "monitoring-instances",
			basePath + "/monitoring-instances/:names":                               "monitoring-instances",
			basePath + "/namespaces/:namespace/database-engines":                    "database-engines",
			basePath + "/namespaces/:namespace/database-engines/:name":              "database-engines",
			basePath + "/namespaces/:namespace/database-clusters":                   "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name":             "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name/backups":     "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name/credentials": "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name/pitr":        "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name/restores":    "database-clusters",
			basePath + "/namespaces/:namespace/database-clusters/:name/components":  "database-clusters",
			basePath + "/namespaces/:namespace/database-cluster-backups":            "database-cluster-backups",
			basePath + "/namespaces/:namespace/database-cluster-backups/:name":      "database-cluster-backups",
			basePath + "/namespaces/:namespace/database-cluster-restores":           "database-cluster-restores",
			basePath + "/namespaces/:namespace/database-cluster-restores/:name":     "database-cluster-restores",
		}
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
		case "database-clusters", "database-engines":
			namespace := c.Param("namespace")
			name := c.Param("name")
			object = namespace + "/" + name
		}

		action, ok := actionMethodMap[c.Request().Method]
		if !ok {
			return false, errors.New("invalid method")
		}
		return enforcer.Enforce(user, resource, action, object)
	}
}

// NewSkipper returns a function to check if a path should be skipped
// from RBAC.
func NewSkipper() func(c echo.Context) bool {
	return func(c echo.Context) bool {
		skipPaths := []string{
			"/session",
			"/version",
			"/cluster-info",
			"/resources",
			"/namespaces",
			"/settings",
		}
		path := strings.TrimPrefix(c.Request().URL.Path, "/v1")
		return slices.Contains(skipPaths, path)
	}
}
