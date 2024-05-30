package reloader

import (
	"errors"

	"github.com/casbin/casbin/v2"
	"go.uber.org/zap"
	"golang.org/x/net/context"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
	toolscache "k8s.io/client-go/tools/cache"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type configMapReloader struct {
	namespacedName types.NamespacedName
	cache          cache.Cache
	cfg            *rest.Config
	enforcer       *casbin.Enforcer
	l              *zap.SugaredLogger
}

// New returns a new k8s based reloader for the casbin policy.
func New(
	cfg *rest.Config,
	e *casbin.Enforcer,
	cm types.NamespacedName,
	l *zap.SugaredLogger) (*configMapReloader, error) {
	// Create a new cache that watches the provided ConfigMap.
	cacheOpts := cache.Options{
		ByObject: map[client.Object]cache.ByObject{
			&corev1.ConfigMap{}: {
				Namespaces: map[string]cache.Config{
					cm.Namespace: {},
				},
			},
		},
	}
	cache, err := cache.New(cfg, cacheOpts)
	if err != nil {
		return nil, err
	}
	reloader := &configMapReloader{
		namespacedName: cm,
		cfg:            cfg,
		enforcer:       e,
		cache:          cache,
		l:              l,
	}
	return reloader, nil
}

// Run the kubernetes cache and reload the enforcer when the ConfigMap is updated.
func (r *configMapReloader) Run(ctx context.Context) error {
	inf, err := r.cache.GetInformer(ctx, &corev1.ConfigMap{})
	if err != nil {
		return errors.Join(err, errors.New("failed to get informer"))
	}
	inf.AddEventHandler(toolscache.ResourceEventHandlerFuncs{
		UpdateFunc: func(oldObj, newObj interface{}) {
			cm, ok := newObj.(*corev1.ConfigMap)
			if !ok {
				return
			}
			if cm.GetName() != cm.Name {
				return
			}
			// Reload the enforcer
			if err := r.enforcer.LoadPolicy(); err != nil {
				r.l.Error("failed to reload enforcer", zap.Error(err))
			}
			r.l.Info("RBAC policy reloaded")
		},
	})
	go func() {
		// This is a blocking call, so we run it in a separate goroutine.
		if err := r.cache.Start(ctx); err != nil {
			r.l.Error("failed to Start cache", zap.Error(err))
		}
	}()
	return nil
}
