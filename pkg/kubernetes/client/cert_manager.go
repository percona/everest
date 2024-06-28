package client

import (
	"context"

	certmanv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
)

// CreateIssuer creates the given issuer resources.
func (c *Client) CreateIssuer(
	ctx context.Context,
	issuer *certmanv1.Issuer,
) (*certmanv1.Issuer, error) {
	return c.customClientSet.
		CertManager(issuer.GetNamespace()).
		CreateIssuer(ctx, issuer)
}

// CreateClusterIssuer creates the given cluster issuer resources.
func (c *Client) CreateClusterIssuer(
	ctx context.Context,
	issuer *certmanv1.ClusterIssuer,
) (*certmanv1.ClusterIssuer, error) {
	return c.customClientSet.
		CertManager(issuer.GetNamespace()).
		CreateClusterIssuer(ctx, issuer)
}

// CreateCertificate creates the given certificate resources.
func (c *Client) CreateCertificate(
	ctx context.Context,
	certificate *certmanv1.Certificate,
) (*certmanv1.Certificate, error) {
	return c.customClientSet.
		CertManager(certificate.GetNamespace()).
		CreateCertificate(ctx, certificate)
}
