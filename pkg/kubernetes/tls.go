package kubernetes

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"time"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
)

const (
	tlsCrtFileName = "tls.crt"
	tlsKeyFileName = "tls.key"
)

// Returns: tls.crt, tls.key, error.
func tlsCertPair() ([]byte, []byte, error) {
	priv, err := generatePrivateKey()
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("failed to generate RSA key"))
	}
	pub := priv.Public().(*rsa.PublicKey) //nolint:forcetypeassert
	keyUsage := x509.KeyUsageDigitalSignature
	keyUsage |= x509.KeyUsageKeyEncipherment

	notBefore := time.Now()
	notAfter := notBefore.Add(time.Hour * 24 * 365)

	serialNumberLimit := (&big.Int{}).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("failed to generate serial number"))
	}

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Percona Everest"},
		},
		NotBefore: notBefore,
		NotAfter:  notAfter,

		KeyUsage:              keyUsage,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames: []string{
			"localhost",
			"everest",
			fmt.Sprintf("everest.%s", common.SystemNamespace),
			fmt.Sprintf("everest.%s.svc", common.SystemNamespace),
			fmt.Sprintf("everest.%s.svc.cluster.local", common.SystemNamespace),
		},
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, pub, priv)
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("failed to create certificate"))
	}
	crtEncodedBytes := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: derBytes})

	privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("failed to marshal private key"))
	}
	keyEncodedBytes := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})
	return crtEncodedBytes, keyEncodedBytes, nil
}

// CreateTLSCertificate creates a new TLS certificate and private key and stores them in a secret.
func (k *Kubernetes) CreateTLSCertificate(ctx context.Context) error {
	crt, key, err := tlsCertPair()
	if err != nil {
		return err
	}

	// Check if the secret exists?
	exists := false
	secret, err := k.GetSecret(ctx, common.SystemNamespace, common.EverestTLSSecretName)
	if err == nil {
		exists = true
	} else if !k8serrors.IsNotFound(err) {
		return err
	}
	// Create secret if it doesn't exists.
	if !exists {
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestTLSSecretName,
				Namespace: common.SystemNamespace,
			},
			Data: map[string][]byte{
				tlsCrtFileName: crt,
				tlsKeyFileName: key,
			},
		}
		if _, err := k.CreateSecret(ctx, secret); err != nil {
			return err
		}
		return nil
	}
	// Otherwise, update the secret.
	secret.Data[tlsCrtFileName] = crt
	secret.Data[tlsKeyFileName] = key
	if _, err := k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	return nil
}
