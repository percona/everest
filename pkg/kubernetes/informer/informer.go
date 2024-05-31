package informer

import (
	"context"
	"errors"

	"go.uber.org/zap"
	"k8s.io/client-go/rest"
	toolscache "k8s.io/client-go/tools/cache"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// informer is a generic wrapper around the controller-runtime cache.
// It provides a minimastic interface for watching Kubernetes objects
// and triggering callbacks.
type informer struct {
	cache cache.Cache

	opts          cache.Options
	cfg           *rest.Config
	eventHandlers toolscache.ResourceEventHandlerFuncs
	l             *zap.SugaredLogger
}

type optionsFunc func(*informer)

// WithConfig sets the rest.Config for the informer.
func WithConfig(cfg *rest.Config) optionsFunc {
	return func(i *informer) {
		i.cfg = cfg
	}
}

// WithLogger sets the logger for the informer.
func WithLogger(l *zap.SugaredLogger) optionsFunc {
	return func(i *informer) {
		i.l = l
	}
}

// Watches sets the informer to watch the given object.
// If a namespace is provided, the informer will only watch the object only in
// that namespace.
func Watches(obj client.Object, ns ...string) optionsFunc {
	return func(i *informer) {
		if i.opts.ByObject == nil {
			i.opts.ByObject = make(map[client.Object]cache.ByObject)
		}
		i.opts.ByObject[obj] = cache.ByObject{}
		namespace := ""
		if len(ns) > 0 {
			namespace = ns[0]
		}
		if namespace != "" {
			i.opts.ByObject[obj] = cache.ByObject{
				Namespaces: map[string]cache.Config{
					namespace: {},
				},
			}
		}
	}
}

// New creates and returns a new informer.
func New(opts ...optionsFunc) (*informer, error) {
	i := &informer{}
	for _, opt := range opts {
		opt(i)
	}

	cache, err := cache.New(i.cfg, i.opts)
	if err != nil {
		return nil, err
	}
	i.cache = cache
	return i, nil
}

// OnUpdate is triggered when an object is updated.
func (i *informer) OnUpdate(cb func(oldObj, newObj interface{})) {
	i.eventHandlers.UpdateFunc = cb
}

// OnAdd is triggered when an object is added.
func (i *informer) OnAdd(cb func(obj interface{})) {
	i.eventHandlers.AddFunc = cb
}

// OnDelete is triggered when an object is deleted.
func (i *informer) OnDelete(cb func(obj interface{})) {
	i.eventHandlers.DeleteFunc = cb
}

// Start the informer.
func (i *informer) Start(ctx context.Context, obj client.Object) error {
	// Get the informer for the specified object.
	inf, err := i.cache.GetInformer(ctx, obj)
	if err != nil {
		return errors.Join(err, errors.New("failed to get informer"))
	}
	// Register callbacks.
	if _, err := inf.AddEventHandler(i.eventHandlers); err != nil {
		return err
	}
	// Start the cache in a separate goroutine, since it is a blocking call.
	go func() {
		if err := i.cache.Start(ctx); err != nil {
			i.l.Error("failed to start cache", zap.Error(err))
		}
	}()
	return nil
}
