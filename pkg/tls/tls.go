// Package tls provides a helper for managing external TLS certificates.
package tls

import "crypto/tls"

// TLSCertManager provides an interface for getting TLS certificates that
// are managed externally (local files, secrets, vault, etc.)
type TLSCertManager interface {
	GetCertificate() (*tls.Certificate, error)
}
