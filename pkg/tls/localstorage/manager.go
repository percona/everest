// Package localstorage provides a helper for managing TLS certificates stored on local storage.
package localstorage

import (
	"context"
	"crypto/tls"
	"sync"

	"github.com/fsnotify/fsnotify"
	tlsManager "github.com/percona/everest/pkg/tls"
	"go.uber.org/zap"
)

var _ tlsManager.TLSCertManager = (*filepathTlsCertManager)(nil)

// filepathTlsCertManager watches TLS certificates stored on local
// storage, and refreshes them.
// It implements the TLSCertManager interface.
type filepathTlsCertManager struct {
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
	certFilePath, keyFilePath string) (*filepathTlsCertManager, error) {
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
	mgr := &filepathTlsCertManager{
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
func (m *filepathTlsCertManager) GetCertificate() (*tls.Certificate, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return &m.certificate, nil
}

func (m *filepathTlsCertManager) reload() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	cert, err := tls.LoadX509KeyPair(m.certFilePath, m.keyFilePath)
	if err != nil {
		return err
	}
	m.certificate = cert
	return nil
}

func (m *filepathTlsCertManager) watchLocalStorage(ctx context.Context) error {
	defer m.watcher.Close()
	for {
		select {
		case <-ctx.Done():
			if err := ctx.Err(); err != nil {
				m.log.Error("context error", zap.Error(err))
				return err
			}
		case _ = <-m.watcher.Events:
			if err := m.reload(); err != nil {
				m.log.Error("failed to reload certificates", zap.Error(err))
				return err
			}
		}
	}
}

func (m *filepathTlsCertManager) Start(ctx context.Context) error {
	go m.watchLocalStorage(ctx)
	return nil
}
