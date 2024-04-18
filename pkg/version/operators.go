// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package version

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

// SupportedEngineVersions returns a list of supported versions for a given operator.
// The result is sorted in ascending order, i.e, smallest version first.
func SupportedEngineVersions(
	ctx context.Context,
	operator string,
	version string,
	versionServiceURL string,
) ([]string, error) {
	p, err := url.Parse(versionServiceURL)
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

// MinimumSupportedEngineVersion returns the minimum supported version for a given operator.
func MinimumSupportedEngineVersion(
	ctx context.Context,
	operator string,
	version string,
	versionServiceURL string,
) (string, error) {
	supportedVersions, err := SupportedEngineVersions(ctx, operator, version, versionServiceURL)
	if err != nil {
		return "", err
	}
	slices.Sort(supportedVersions)
	// supportedVersions will always contain at least one element.
	return supportedVersions[0], nil
}
