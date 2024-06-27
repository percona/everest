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

// CreateTLSCertificate creates a new TLS certificate and private key and stores them in a secret.
func (k *Kubernetes) CreateTLSCertificate(ctx context.Context) error {
	priv, err := generatePrivateKey()
	if err != nil {
		return errors.Join(err, errors.New("failed to generate RSA key"))
	}
	pub := priv.Public().(*rsa.PublicKey) //nolint:forcetypeassert
	keyUsage := x509.KeyUsageDigitalSignature
	keyUsage |= x509.KeyUsageKeyEncipherment

	notBefore := time.Now()
	notAfter := notBefore.Add(time.Hour * 24 * 365)

	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return errors.Join(err, errors.New("failed to generate serial number"))
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
		return errors.Join(err, errors.New("failed to create certificate"))
	}
	crtEncodedBytes := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: derBytes})

	privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return errors.Join(err, errors.New("failed to marshal private key"))
	}
	keyEncodedBytes := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})

	// Check if the secret exists?
	exists := false
	secret, err := k.GetSecret(ctx, common.SystemNamespace, common.EverestTLSecretName)
	if err == nil {
		exists = true
	} else if !k8serrors.IsNotFound(err) {
		return err
	}
	// Create secret if it doesn't exists.
	if !exists {
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestTLSecretName,
				Namespace: common.SystemNamespace,
			},
			Data: map[string][]byte{
				tlsCrtFileName: crtEncodedBytes,
				tlsKeyFileName: keyEncodedBytes,
			},
		}
		if _, err := k.CreateSecret(ctx, secret); err != nil {
			return err
		}
		// Restart the deployment to pick up the new secret.
		return k.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
	}
	// Otherwise, update the secret.
	secret.Data[tlsCrtFileName] = crtEncodedBytes
	secret.Data[tlsKeyFileName] = keyEncodedBytes
	if _, err := k.UpdateSecret(ctx, secret); err != nil {
		return err
	}
	// Restart the deployment to pick up the new secret.
	return k.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
}
