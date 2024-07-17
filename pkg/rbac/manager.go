package rbac

import (
	"context"
	"errors"

	"github.com/casbin/casbin/v2"
	"github.com/labstack/echo/v4"
	"github.com/percona/everest/pkg/kubernetes"
	"go.uber.org/zap"
)

type Manager struct {
	enforcer        *casbin.Enforcer
	globalResources globalResourceGetter
	logger          *zap.SugaredLogger
}

type Options struct {
	k        *kubernetes.Kubernetes
	filepath string
	logger   *zap.SugaredLogger
}

// New creates a new manager for RBAC.
func New(ctx context.Context, o *Options) (m *Manager, err error) {
	// The Casbin library lacks proper error handling,
	// so we need to recover from panics.
	defer func() {
		if r := recover(); r != nil {
			err = errors.New("invalid policy")
			m = nil
		}
	}()

	var enforcer *casbin.Enforcer
	if o.filepath != "" {
		e, err := newFilePathEnforcer(o.filepath)
		if err != nil {
			return nil, errors.Join(err, errors.New("cannot create enforcer from file"))
		}
		enforcer = e
	} else if o.k != nil {
		e, err := newConfigMapEnforcer(ctx, o.k, o.logger)
		if err != nil {
			return nil, errors.Join(err, errors.New("cannot create enforcer from kubernetes"))
		}
		enforcer = e
	} else {
		return nil, errors.New("no enforcer source provided")
	}
	return &Manager{
		enforcer: enforcer,
		logger:   o.logger,
	}, nil
}

// Handler returns a function that can be used as a middleware for echo.
func (m *Manager) Handler() func(c echo.Context, user string) (bool, error) {
	return nil
}

// Validate the RBAC policy.
func (m *Manager) Validate() error {
	return nil
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
	if resource == "backup-storages" {
	}

	if resource == "monitoring-instances" {
	}
	return m.enforcer.Enforce(subject, action, resource, object)
}
