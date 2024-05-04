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
	"errors"
	"fmt"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
)

// RecommendedVersion holds recommended versions per component.
type RecommendedVersion struct {
	Catalog         *goversion.Version
	EverestOperator *goversion.Version
	OLM             *goversion.Version
	PG              *goversion.Version
	PSMDB           *goversion.Version
	PXC             *goversion.Version
}

// RecommendedVersions returns recommended version information based on metadata.
func RecommendedVersions(meta *version.MetadataVersion) (*RecommendedVersion, error) {
	recVer := &RecommendedVersion{}

	if olm, ok := meta.GetRecommended()["olm"]; ok {
		v, err := goversion.NewSemver(olm)
		if err != nil {
			return nil, errors.Join(err, fmt.Errorf("invalid OLM version %s", olm))
		}
		recVer.OLM = v
	}

	if catalog, ok := meta.GetRecommended()["catalog"]; ok {
		v, err := goversion.NewSemver(catalog)
		if err != nil {
			return nil, errors.Join(err, fmt.Errorf("invalid catalog version %s", catalog))
		}
		recVer.Catalog = v
	}

	return recVer, nil
}
