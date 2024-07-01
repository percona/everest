package client

import cmVersioned "github.com/cert-manager/cert-manager/pkg/client/clientset/versioned"

// CertManager returns CertManager client set.
//
//nolint:ireturn
func (c *Client) CertManager() cmVersioned.Interface {
	return c.cmClientset
}
