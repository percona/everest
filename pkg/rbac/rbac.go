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
	casbinmiddleware "github.com/labstack/echo-contrib/casbin"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	everestclient "github.com/percona/everest/client"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/informer"
	configmapadapter "github.com/percona/everest/pkg/rbac/configmap-adapter"
	"github.com/percona/everest/pkg/rbac/fileadapter"
	"github.com/percona/everest/pkg/session"
)

var errObjectLinkedToUnauthorisedNamespace = errors.New("object linked to unauthorised namespace")

// globalResourceGetter is an interface for getting
// global (non-namespaced) resources like monitoring-configs and backup-storages.
type globalResourceGetter interface {
	GetMonitoringConfig(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error)
	GetBackupStorage(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error)
}

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
			panic("invalid policy detected - " + err.Error())
		}
		if err := validatePolicy(enforcer); err != nil {
			panic("invalid policy detected - " + err.Error())
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
	if err := validatePolicy(enforcer); err != nil {
		return nil, err
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

func handleBackupStorage(
	ctx context.Context,
	getter globalResourceGetter,
	enforcer *casbin.Enforcer,
	user, action, bsName string) error {
	bs, err := getter.GetBackupStorage(ctx, common.SystemNamespace, bsName)
	if err != nil {
		return err
	}
	// Is it used in a namespace that the user does not have access to?
	for _, ns := range bs.Spec.AllowedNamespaces {
		if allowed, err := enforcer.Enforce(user, "backup-storages", action, ns+"/"+bsName); err != nil {
			return err
		} else if !allowed {
			return errObjectLinkedToUnauthorisedNamespace
		}
	}
	return nil
}

func handleMonitoringConfig(
	ctx context.Context,
	getter globalResourceGetter,
	enforcer *casbin.Enforcer,
	user, action, bsName string) error {
	bs, err := getter.GetMonitoringConfig(ctx, common.SystemNamespace, bsName)
	if err != nil {
		return err
	}
	// Is it used in a namespace that the user does not have access to?
	for _, ns := range bs.Spec.AllowedNamespaces {
		if allowed, err := enforcer.Enforce(user, "monitoring-instances", action, ns+"/"+bsName); err != nil {
			return err
		} else if !allowed {
			return errObjectLinkedToUnauthorisedNamespace
		}
	}
	return nil
}

// NewEnforceHandler returns a function that checks if a user is allowed to access a resource.
func NewEnforceHandler(ctx context.Context, cfg *rest.Config, basePath string, enforcer *casbin.Enforcer) func(c echo.Context, user string) (bool, error) {
	pathResourceMap, _, err := buildPathResourceMap(basePath)
	if err != nil {
		panic("failed to build path resource map: " + err.Error())
	}
	cache, err := newCache(ctx, zap.NewNop().Sugar(), cfg)
	if err != nil {
		panic("cannot initialize cache for global resources: " + err.Error())
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

		action, ok := actionMethodMap[c.Request().Method]
		if !ok {
			return false, errors.New("invalid method")
		}

		switch resource {
		case "namespaces":
			name := c.Param("name")
			object = name
		case "backup-storages":
			bsName := c.Param("name")
			object = bsName
			if bsName != "" {
				return true, handleBackupStorage(ctx, cache, enforcer, user, action, bsName)
			}
		case "monitoring-instances":
			mcName := c.Param("name")
			object = mcName
			if mcName != "" {
				return true, handleMonitoringConfig(ctx, cache, enforcer, user, action, mcName)
			}
		default:
			namespace := c.Param("namespace")
			name := c.Param("name")
			object = namespace + "/" + name
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

// Can checks if a user is allowed to perform an action on a resource.
// Input request should be of the form [user action resource object].
func Can(ctx context.Context, filePath string, k *kubernetes.Kubernetes, req ...string) (bool, error) {
	if len(req) != 4 { //nolint:mnd
		return false, errors.New("expected input of the form [user action resource object]")
	}
	user, action, resource, object := req[0], req[1], req[2], req[3]
	enforcer, err := newKubeOrFileEnforcer(ctx, k, filePath)
	if err != nil {
		return false, err
	}
	return enforcer.Enforce(user, resource, action, object)
}

func ErrorHandler(c echo.Context, internal error, proposedStatus int) error {
	if errors.Is(internal, errObjectLinkedToUnauthorisedNamespace) {
		msg := "Object is used in a namespace that you do not have access to"
		err := echo.NewHTTPError(proposedStatus, msg)
		err.Internal = errors.New(msg)
		return err
	}
	return casbinmiddleware.DefaultConfig.ErrorHandler(c, internal, proposedStatus)
}
