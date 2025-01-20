package certwatcher

import (
	"context"
	"crypto/tls"
	"sync"

	"github.com/fsnotify/fsnotify"
	"go.uber.org/zap"
)

type certWatcher struct {
	cert              *tls.Certificate
	certFile, keyFile string
	log               *zap.SugaredLogger

	mutex sync.RWMutex
}

// GetCertificate returns the certificate.
func (w *certWatcher) GetCertificate(_ *tls.ClientHelloInfo) (*tls.Certificate, error) {
	w.mutex.RLock()
	defer w.mutex.RUnlock()
	return w.cert, nil
}

// New returns a new cert watcher.
func New(log *zap.SugaredLogger, certFile, keyFile string) (*certWatcher, error) {
	w := &certWatcher{
		certFile: certFile,
		keyFile:  keyFile,
		log:      log,
	}
	if err := w.loadCertificate(); err != nil {
		return nil, err
	}
	return w, nil
}

func (w *certWatcher) loadCertificate() error {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	cert, err := tls.LoadX509KeyPair(w.certFile, w.keyFile)
	if err != nil {
		return err
	}
	w.cert = &cert
	return nil
}

// Start the certificate files watcher until the context is closed.
func (w *certWatcher) Start(ctx context.Context) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	watcher.Add(w.certFile)
	watcher.Add(w.keyFile)

	w.log.Infow("Watching certificate files for changes", "certFile", w.certFile, "keyFile", w.keyFile)

	go func() {
		for {
			select {
			case <-ctx.Done():
				if err := watcher.Close(); err != nil {
					w.log.Errorw("Failed to close watcher", "error", err)
				}
			case <-watcher.Events:
				w.log.Info("Certificate updated")
				if err := w.loadCertificate(); err != nil {
					w.log.Errorw("Failed to reload certificate", "error", err)
				}
			}
		}
	}()
	return nil
}
