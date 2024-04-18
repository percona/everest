package versionservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"slices"
	"strings"

	perconavs "github.com/Percona-Lab/percona-version-service/versionpb"
	version "github.com/Percona-Lab/percona-version-service/versionpb"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	// PXCOperatorName is the name of the PXC operator in the version service.
	PXCOperatorName = "pxc-operator"
	// PSMDBOperatorName is the name of the PSMDB operator in the version service.
	PSMDBOperatorName = "psmdb-operator"
	// PGOperatorName is the name of the PG operator in the version service.
	PGOperatorName = "pg-operator"
)

// EngineTypeToOperatorName maps an engine type to the operator name in the version service.
//
//nolint:gochecknoglobals
var EngineTypeToOperatorName = map[everestv1alpha1.EngineType]string{
	everestv1alpha1.DatabaseEnginePXC:        PXCOperatorName,
	everestv1alpha1.DatabaseEnginePSMDB:      PSMDBOperatorName,
	everestv1alpha1.DatabaseEnginePostgresql: PGOperatorName,
}

type Interface interface {
	GetSupportedEngineVersions(ctx context.Context, operator, version string) ([]string, error)
	GetEverestMetadata(ctx context.Context) (*perconavs.MetadataResponse, error)
}

type versionServiceClient struct {
	url string
}

func New(url string) *versionServiceClient {
	return &versionServiceClient{url: url}
}

// GetSupportedEngineVersions returns a list of supported versions for a given operator and version.
func (c *versionServiceClient) GetSupportedEngineVersions(ctx context.Context, operator, version string) ([]string, error) {
	p, err := url.Parse(c.url)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not parse version service URL"))
	}
	version = strings.TrimPrefix(version, "v")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.JoinPath("versions/v1", operator, version).String(), nil)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create version service request"))
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not retrieve version response"))
	}
	defer res.Body.Close() //nolint:errcheck

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid response from version service endpoint http %d", res.StatusCode)
	}
	response := &perconavs.VersionResponse{}
	if err = json.NewDecoder(res.Body).Decode(response); err != nil {
		return nil, errors.Join(err, errors.New("could not decode version response"))
	}

	if len(response.GetVersions()) == 0 {
		return nil, errors.New("no versions found")
	}

	var versions map[string]*perconavs.Version
	switch operator {
	case PXCOperatorName:
		versions = response.GetVersions()[0].GetMatrix().GetPxc()
	case PSMDBOperatorName:
		versions = response.GetVersions()[0].GetMatrix().GetMongod()
	case PGOperatorName:
		versions = response.GetVersions()[0].GetMatrix().GetPostgresql()
	}

	result := make([]string, 0, len(versions))
	for ver := range versions {
		result = append(result, ver)
	}
	slices.Sort(result)
	return result, nil
}

// GetEverestMetadata returns the Everest metadata from the version service.
func (c *versionServiceClient) GetEverestMetadata(ctx context.Context) (*perconavs.MetadataResponse, error) {
	p, err := url.Parse(c.url)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not parse version Everest metadata URL"))
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.JoinPath("metadata/v1/everest").String(), nil)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create Everest metadata request"))
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not retrieve Everest metadata"))
	}
	defer res.Body.Close() //nolint:errcheck

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid response from Everest metadata endpoint http %d", res.StatusCode)
	}
	requirements := &version.MetadataResponse{}
	if err = json.NewDecoder(res.Body).Decode(requirements); err != nil {
		return nil, errors.Join(err, errors.New("could not decode requirements from Everest metadata"))
	}
	return requirements, nil
}
