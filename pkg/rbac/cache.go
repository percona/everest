package rbac

import (
	"context"
	"errors"
	"sync"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/kubernetes/informer"
	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
)

type objectCache struct {
	monitoringInstances map[string]*everestv1alpha1.MonitoringConfig
	backupStorages      map[string]*everestv1alpha1.BackupStorage

	informer *informer.Informer
	mutex    sync.RWMutex
}

var _ globalResourceGetter = (*objectCache)(nil)

func (c *objectCache) onAdd(obj interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	mc, ok := obj.(*everestv1alpha1.MonitoringConfig)
	if ok {
		c.monitoringInstances[mc.GetName()] = mc
		return
	}
	bs, ok := obj.(*everestv1alpha1.BackupStorage)
	if ok {
		c.backupStorages[bs.GetName()] = bs
		return
	}
	return
}

func (c *objectCache) onUpdate(_, new interface{}) {
	c.onAdd(new)
}

func (c *objectCache) onDelete(obj interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	mc, ok := obj.(*everestv1alpha1.MonitoringConfig)
	if ok {
		delete(c.monitoringInstances, mc.GetName())
		return
	}
	bs, ok := obj.(*everestv1alpha1.BackupStorage)
	if ok {
		delete(c.backupStorages, bs.GetName())
		return
	}
	return
}

func newCache(ctx context.Context, l *zap.SugaredLogger, cfg *rest.Config) (*objectCache, error) {
	c := &objectCache{
		monitoringInstances: make(map[string]*everestv1alpha1.MonitoringConfig),
		backupStorages:      make(map[string]*everestv1alpha1.BackupStorage),
	}

	// Initialize informer.
	informer, err := informer.New(
		informer.WithConfig(cfg),
		informer.WithLogger(l),
		informer.Watches(&everestv1alpha1.MonitoringConfig{}),
		informer.Watches(&everestv1alpha1.BackupStorage{}),
	)
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot initialize informer"))
	}

	// Register callbacks.
	informer.OnAdd(c.onAdd)
	informer.OnUpdate(c.onUpdate)
	informer.OnDelete(c.onDelete)

	// Start informers.
	if err := informer.Start(ctx, &everestv1alpha1.MonitoringConfig{}); err != nil {
		return nil, errors.Join(err, errors.New("cannot start informer for MonitoringConfig"))
	}
	if err := informer.Start(ctx, &everestv1alpha1.BackupStorage{}); err != nil {
		return nil, errors.Join(err, errors.New("cannot start informer for BackupStorage"))
	}
	c.informer = informer
	return c, nil
}

// GetMonitoringConfig gets the monitoring config.
func (c *objectCache) GetMonitoringConfig(ctx context.Context, _, name string) (*everestv1alpha1.MonitoringConfig, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	mc, ok := c.monitoringInstances[name]
	if !ok {
		return nil, k8serrors.NewNotFound(schema.GroupResource{}, name)
	}
	return mc, nil
}

// GetBackupStorage gets the backup storage.
func (c *objectCache) GetBackupStorage(ctx context.Context, _, name string) (*everestv1alpha1.BackupStorage, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	bs, ok := c.backupStorages[name]
	if !ok {
		return nil, k8serrors.NewNotFound(schema.GroupResource{}, name)
	}
	return bs, nil
}
