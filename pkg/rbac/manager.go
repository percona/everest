// Package rbac ...
package rbac

import (
	"context"
	"errors"
	"io/fs"
	"slices"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	everestclient "github.com/percona/everest/client"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/informer"
	configmapadapter "github.com/percona/everest/pkg/rbac/configmap-adapter"
	"github.com/percona/everest/pkg/rbac/fileadapter"
)

// kubeAPI is an internal interface for this package,
// which is used by the RBAC manager to interact with the Kubernetes API.
type kubeAPI interface {
	GetMonitoringConfig(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error)
	GetBackupStorage(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error)
}

const (
	backupStoragesResourceName      = "backup-storages"
	monitoringInstancesResourceName = "monitoring-instances"
)

//nolint:gochecknoglobals
var methodToAction = map[string]string{
	"GET":    "read",
	"POST":   "create",
	"PUT":    "update",
	"PATCH":  "update",
	"DELETE": "delete",
}

// Manager manages RBAC.
type Manager struct {
	enforcer *casbin.Enforcer
	kube     kubeAPI
	logger   *zap.SugaredLogger
}

// Options for configuring RBAC manager.
type Options struct {
	Kubernetes *kubernetes.Kubernetes
	Filepath   string
	Logger     *zap.SugaredLogger
}

// New creates a new manager for RBAC.
//
//nolint:nonamedreturns
func New(ctx context.Context, o *Options) (m *Manager, err error) {
	// The Casbin library lacks proper error handling,
	// so we need to recover from panics.
	defer func() {
		if r := recover(); r != nil {
			err = errors.New("invalid policy")
			m = nil
		}
	}()

	if o.Filepath == "" && o.Kubernetes == nil {
		return nil, errors.New("no enforcer source provided")
	}

	if o.Filepath != "" && o.Kubernetes != nil {
		return nil, errors.New("cannot use both file and kubernetes as enforcer sources")
	}

	manager := &Manager{
		logger: o.Logger,
	}

	if o.Kubernetes != nil {
		enforcer, err := newConfigMapEnforcer(ctx, o.Kubernetes, o.Logger)
		if err != nil {
			return nil, errors.Join(err, errors.New("cannot create enforcer from kubernetes"))
		}
		cache, err := newCache(ctx, o.Logger, o.Kubernetes.Config())
		if err != nil {
			return nil, errors.Join(err, errors.New("cannot create cache for global resources"))
		}
		manager.kube = cache
		manager.enforcer = enforcer
	}

	if o.Filepath != "" {
		enforcer, err := newFilePathEnforcer(o.Filepath)
		if err != nil {
			return nil, errors.Join(err, errors.New("cannot create enforcer from file"))
		}
		manager.enforcer = enforcer
	}
	return manager, nil
}

// Handler returns a function that can be used as a middleware for echo.
func (m *Manager) Handler(ctx context.Context, basePath string) func(c echo.Context, user string) (bool, error) {
	pathResourceMap, _, err := buildPathResourceMap(basePath)
	if err != nil {
		panic("failed to build path resource map: " + err.Error())
	}
	return func(c echo.Context, user string) (bool, error) {
		var resource string
		var object string
		resource, ok := pathResourceMap[c.Path()]
		if !ok {
			return false, errors.New("invalid URL")
		}

		action, ok := methodToAction[c.Request().Method]
		if !ok {
			return false, errors.New("invalid method")
		}

		switch resource {
		case "namespaces":
			name := c.Param("name")
			object = name
		case backupStoragesResourceName:
			bsName := c.Param("name")
			// We're trying to list all backup-storages,
			// so at the enforcer level, we always allow it.
			// But the actual list of backup-storages is filtered by the API.
			if bsName == "" {
				return true, nil
			}
			object = bsName
		case monitoringInstancesResourceName:
			mcName := c.Param("name")
			// We're trying to list all monitoring-instances,
			// so at the enforcer level, we always allow it.
			// But the actual list of backup-storages is filtered by the API.
			if mcName == "" {
				return true, nil
			}
			object = mcName
		default:
			namespace := c.Param("namespace")
			name := c.Param("name")
			object = namespace + "/" + name
		}
		return m.Can(ctx, user, action, resource, object)
	}
}

// Skipper returns a function that is used by the RBAC middleware
// to determine when an API path should be skipped from RBAC.
func (m *Manager) Skipper(basePath string) func(echo.Context) bool {
	_, skipPaths, err := buildPathResourceMap(basePath)
	if err != nil {
		panic("failed to build path resource map: " + err.Error())
	}
	return func(c echo.Context) bool {
		return slices.Contains(skipPaths, c.Request().URL.Path)
	}
}

// Validate the RBAC policy.
func (m *Manager) Validate() error {
	return validatePolicy(m.enforcer)
}

// GetEnforcer gets the enforcer.
func (m *Manager) GetEnforcer() *casbin.Enforcer {
	return m.enforcer
}

// Can checks if the given subject can perform the given action
// on a resource of given type and name.
func (m *Manager) Can(
	ctx context.Context,
	subject, action, resource, object string,
) (bool, error) {
	if m.kube != nil {
		if resource == backupStoragesResourceName && object != "" {
			return m.enforceBackupStorage(ctx, subject, action, object)
		}

		if resource == monitoringInstancesResourceName && object != "" {
			return m.enforceMonitoringConfig(ctx, subject, action, object)
		}
	}
	return m.enforcer.Enforce(subject, resource, action, object)
}

func (m *Manager) enforceBackupStorage(
	ctx context.Context,
	user, action, bsName string,
) (bool, error) {
	bs, err := m.kube.GetBackupStorage(ctx, common.SystemNamespace, bsName)
	if err != nil {
		return false, err
	}
	// Is it used in a namespace that the user does not have access to?
	for _, ns := range bs.Spec.AllowedNamespaces {
		if allowed, err := m.enforcer.Enforce(user, backupStoragesResourceName, action, ns+"/"+bsName); err != nil {
			return false, err
		} else if !allowed {
			return false, nil
		}
	}
	return true, nil
}

func (m *Manager) enforceMonitoringConfig(
	ctx context.Context,
	user, action, mcName string,
) (bool, error) {
	mc, err := m.kube.GetMonitoringConfig(ctx, common.SystemNamespace, mcName)
	if err != nil {
		return false, err
	}
	// Is it used in a namespace that the user does not have access to?
	for _, ns := range mc.Spec.AllowedNamespaces {
		if allowed, err := m.enforcer.Enforce(user, monitoringInstancesResourceName, action, ns+"/"+mcName); err != nil {
			return false, err
		} else if !allowed {
			return false, nil
		}
	}
	return true, nil
}

func getModel() (model.Model, error) {
	modelData, err := fs.ReadFile(data.RBAC, "rbac/model.conf")
	if err != nil {
		return nil, errors.Join(err, errors.New("could not read casbin model"))
	}
	return model.NewModelFromString(string(modelData))
}

// NewEnforcer creates a new Casbin enforcer with the RBAC model and ConfigMap adapter.
func newConfigMapEnforcer(ctx context.Context,
	kubeClient *kubernetes.Kubernetes,
	l *zap.SugaredLogger,
) (*casbin.Enforcer, error) {
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
func newFilePathEnforcer(filePath string) (*casbin.Enforcer, error) {
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
