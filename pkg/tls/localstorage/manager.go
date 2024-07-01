// Package localstorage provides a helper for managing TLS certificates stored on local storage.
package localstorage

import (
	"context"
	"crypto/tls"
	"sync"

	"github.com/fsnotify/fsnotify"
	"go.uber.org/zap"

	tlsManager "github.com/percona/everest/pkg/tls"
)

var _ tlsManager.Manager = (*manager)(nil)

// manager watches TLS certificates stored on local
// storage, and refreshes them.
// It implements the TLSCertManager interface.
type manager struct {
	certificate               tls.Certificate
	watcher                   *fsnotify.Watcher
	log                       *zap.SugaredLogger
	certFilePath, keyFilePath string

	mutex sync.RWMutex
}

// New returns a new TLS certificate manager.
// It watches the certFile and keyFile for changes, and updates the internal in-memory structures.
// All Getters and Setters provided by this struct are thread-safe.
func New(log *zap.SugaredLogger,
	certFilePath, keyFilePath string,
) (*manager, error) { //nolint:revive
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	if err := watcher.Add(certFilePath); err != nil {
		return nil, err
	}
	if err := watcher.Add(keyFilePath); err != nil {
		return nil, err
	}
	mgr := &manager{
		watcher:      watcher,
		log:          log,
		certFilePath: certFilePath,
		keyFilePath:  keyFilePath,
	}
	if err := mgr.reload(); err != nil {
		return nil, err
	}
	return mgr, nil
}

// GetCertificate returns the TLS certificate.
func (m *manager) GetCertificate() (*tls.Certificate, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return &m.certificate, nil
}

func (m *manager) reload() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	cert, err := tls.LoadX509KeyPair(m.certFilePath, m.keyFilePath)
	if err != nil {
		return err
	}
	m.certificate = cert
	return nil
}

func (m *manager) watchLocalStorage(ctx context.Context) error {
	defer func() {
		if err := m.watcher.Close(); err != nil {
			m.log.Error("failed to close watcher", zap.Error(err))
		}
	}()
	for {
		select {
		case <-ctx.Done():
			if err := ctx.Err(); err != nil {
				m.log.Error("context error", zap.Error(err))
				return err
			}
		case <-m.watcher.Events:
			if err := m.reload(); err != nil {
				m.log.Error("failed to reload certificates", zap.Error(err))
				return err
			}
		}
	}
}

func (m *manager) Start(ctx context.Context) {
	go func() {
		if err := m.watchLocalStorage(ctx); err != nil {
			panic(err)
		}
	}()
}
