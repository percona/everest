package kubernetes

import (
	"context"
	"time"

	cm "github.com/cert-manager/cert-manager/pkg/apis/certmanager"
	certmanv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
	cmmeta "github.com/cert-manager/cert-manager/pkg/apis/meta/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
)

// IsCertManagerInstalled checks if cert-manager is installed in the cluster.
func (k *Kubernetes) IsCertManagerInstalled(ctx context.Context) (bool, error) {
	_, err := k.client.GetCRD(ctx, "certificates.cert-manager.io")
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

const (
	everestCAIssuerName = "everest-ca-issuer"
	everestCACertName   = "everest-ca-cert"
	everestIssuerName   = "everest-issuer"
)

// ApplyEverestCAIssuer creates a new CA Issuer for Everest.
func (k *Kubernetes) ApplyEverestCAIssuer(ctx context.Context) error {
	if _, err := k.client.CertManager().
		CertmanagerV1().
		Issuers(common.SystemNamespace).
		Create(ctx, &certmanv1.Issuer{
			ObjectMeta: metav1.ObjectMeta{
				Name:      everestCAIssuerName,
				Namespace: common.SystemNamespace,
			},
			Spec: certmanv1.IssuerSpec{
				IssuerConfig: certmanv1.IssuerConfig{
					SelfSigned: &certmanv1.SelfSignedIssuer{},
				},
			},
		}, metav1.CreateOptions{}); err != nil {
		return err
	}
	return nil
}

// ApplyEverestCACertificate creates a new CA certificate for Everest.
func (k *Kubernetes) ApplyEverestCACertificate(ctx context.Context) error {
	if _, err := k.client.CertManager().
		CertmanagerV1().
		Certificates(common.SystemNamespace).
		Create(ctx, &certmanv1.Certificate{
			ObjectMeta: metav1.ObjectMeta{
				Name:      everestCACertName,
				Namespace: common.SystemNamespace,
			},
			Spec: certmanv1.CertificateSpec{
				SecretName: everestCACertName,
				CommonName: "everest-ca",
				IsCA:       true,
				IssuerRef: cmmeta.ObjectReference{
					Name: everestCAIssuerName,
					Kind: certmanv1.IssuerKind,
				},
				Duration:    &metav1.Duration{Duration: time.Hour * 24 * 365},
				RenewBefore: &metav1.Duration{Duration: 730 * time.Hour},
			},
		}, metav1.CreateOptions{}); err != nil {
		return err
	}
	return nil
}

// ApplyEverestIssuer creates a new issuer for everest.
func (k *Kubernetes) ApplyEverestIssuer(ctx context.Context) error {
	if _, err := k.client.CertManager().
		CertmanagerV1().
		Issuers(common.SystemNamespace).
		Create(ctx, &certmanv1.Issuer{
			ObjectMeta: metav1.ObjectMeta{
				Name:      everestIssuerName,
				Namespace: common.SystemNamespace,
			},
			Spec: certmanv1.IssuerSpec{
				IssuerConfig: certmanv1.IssuerConfig{
					CA: &certmanv1.CAIssuer{
						SecretName: everestCACertName,
					},
				},
			},
		}, metav1.CreateOptions{}); err != nil {
		return err
	}
	return nil
}

// ApplyEverestCertificate creates a new certificate for Everest.
func (k *Kubernetes) ApplyEverestCertificate(ctx context.Context) error {
	if _, err := k.client.CertManager().
		CertmanagerV1().
		Certificates(common.SystemNamespace).
		Create(ctx, &certmanv1.Certificate{
			ObjectMeta: metav1.ObjectMeta{
				Name:      common.EverestTLSSecretName,
				Namespace: common.SystemNamespace,
			},
			Spec: certmanv1.CertificateSpec{
				Subject: &certmanv1.X509Subject{
					Organizations: []string{"Percona Everest"},
				},
				CommonName: "everest",
				SecretName: common.EverestTLSSecretName,
				DNSNames:   common.EverestCertDNSNames,
				IsCA:       false,
				Duration:   &metav1.Duration{Duration: time.Hour * 24 * 365},
				IssuerRef: cmmeta.ObjectReference{
					Name:  everestIssuerName,
					Kind:  certmanv1.IssuerKind,
					Group: cm.GroupName,
				},
			},
		}, metav1.CreateOptions{}); err != nil {
		return err
	}
	return nil
}
