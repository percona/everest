package customresources

import (
	"context"

	certmanv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
	"k8s.io/client-go/rest"
)

// CertManager returns a CertManager client.
func (c *Client) CertManager( //nolint:ireturn
	namespace string,
) CertManagerInterface {
	return &certmanclient{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

// CertManagerInterface supports methods to work with CertManager resources.
type CertManagerInterface interface {
	CreateIssuer(ctx context.Context, issuer *certmanv1.Issuer) (*certmanv1.Issuer, error)
	CreateClusterIssuer(ctx context.Context, issuer *certmanv1.ClusterIssuer) (*certmanv1.ClusterIssuer, error)
	CreateCertificate(ctx context.Context, issuer *certmanv1.Certificate) (*certmanv1.Certificate, error)
}

const (
	issuerAPIKind        = "issuers"
	clusterIssuerAPIKind = "clusterissuers"
	certificateAPIKind   = "certificates"
)

type certmanclient struct {
	restClient rest.Interface
	namespace  string
}

// CreateIssuer creates the given issuer resources.
func (c *certmanclient) CreateIssuer(
	ctx context.Context,
	issuer *certmanv1.Issuer,
) (*certmanv1.Issuer, error) {
	result := &certmanv1.Issuer{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(issuerAPIKind).Body(issuer).
		Do(ctx).Into(result)
	return result, err
}

// CreateClusterIssuer creates the given cluster issuer resources.
func (c *certmanclient) CreateClusterIssuer(
	ctx context.Context,
	issuer *certmanv1.ClusterIssuer,
) (*certmanv1.ClusterIssuer, error) {
	result := &certmanv1.ClusterIssuer{}
	err := c.restClient.
		Post().
		Resource(clusterIssuerAPIKind).Body(issuer).
		Do(ctx).Into(result)
	return result, err
}

// CreateCertificate creates the given certificate resources.
func (c *certmanclient) CreateCertificate(
	ctx context.Context,
	certificate *certmanv1.Certificate,
) (*certmanv1.Certificate, error) {
	result := &certmanv1.Certificate{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(certificateAPIKind).Body(certificate).
		Do(ctx).Into(result)
	return result, err
}
