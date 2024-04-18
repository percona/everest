package versionservice

import (
	"context"

	perconavs "github.com/Percona-Lab/percona-version-service/versionpb"
)

type versionServiceClient struct {
	url string
}

func (c *versionServiceClient) GetSupportedEngineVersions(ctx context.Context, operator, version string) ([]string, error) {
	return nil, nil
}

func (c *versionServiceClient) GetMetadata(ctx context.Context) (*perconavs.MetadataResponse, error) {
	return nil, nil
}
