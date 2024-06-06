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

// Package version provides methods to determine the correct version of components.
package version

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	goversion "github.com/hashicorp/go-version"

	"github.com/percona/everest/cmd/config"
)

const (
	devCatalogImage     = "docker.io/perconalab/everest-catalog:latest"
	rcCatalogImage      = "docker.io/perconalab/everest-catalog:%s"
	releaseCatalogImage = "docker.io/percona/everest-catalog:%s"
	devManifestURL      = "https://raw.githubusercontent.com/percona/everest/main/deploy/quickstart-k8s.yaml"
	releaseManifestURL  = "https://raw.githubusercontent.com/percona/everest/v%s/deploy/quickstart-k8s.yaml"
	debugManifestURL    = "https://raw.githubusercontent.com/percona/everest/%s/deploy/quickstart-k8s.yaml"

	everestOperatorChannelStable = "stable-v0"
	everestOperatorChannelFast   = "fast-v0"
)

var (
	// ProjectName is a component name, e.g. everest API Server, everestctl.
	ProjectName string //nolint:gochecknoglobals
	// Version is a component version e.g. v0.3.0-1-a93bef.
	Version string //nolint:gochecknoglobals
	// FullCommit is a git commit hash.
	FullCommit string //nolint:gochecknoglobals
	// EverestChannelOverride overrides the default olm channel for Everest operator.
	EverestChannelOverride string //nolint:gochecknoglobals

	rcSuffix = regexp.MustCompile(`rc\d+$`)
)

// CatalogImage returns a catalog image name.
func CatalogImage(v *goversion.Version) string {
	if isDevVersion(Version) {
		return devCatalogImage
	}
	if EverestChannelOverride != "" {
		// Channels other than stable are only in dev catalog.
		return devCatalogImage
	}
	if isRC(v) {
		return fmt.Sprintf(rcCatalogImage, v)
	}
	return fmt.Sprintf(releaseCatalogImage, v)
}

// ManifestURL returns a manifest URL to install Everest.
func ManifestURL(v *goversion.Version) string {
	if config.Debug {
		return fmt.Sprintf(debugManifestURL, FullCommit)
	}
	if isDevVersion(Version) {
		return devManifestURL
	}
	return fmt.Sprintf(releaseManifestURL, v)
}

// CatalogChannel returns a channel for Everest catalog.
func CatalogChannel() string {
	if EverestChannelOverride != "" {
		return EverestChannelOverride
	}
	v, err := goversion.NewVersion(Version)
	if err == nil && isRC(v) {
		return everestOperatorChannelFast
	}
	return everestOperatorChannelStable
}

func isDevVersion(ver string) bool {
	if ver == "" {
		return true
	}

	v, err := goversion.NewVersion(ver)
	if err != nil {
		panic(err)
	}

	if v.Prerelease() == "" {
		return false
	}

	if isRC(v) {
		return false
	}

	if !strings.HasSuffix(v.Prerelease(), "-upgrade-test") {
		return true
	}

	return false
}

func isRC(v *goversion.Version) bool {
	return rcSuffix.MatchString(v.Prerelease())
}

// FullVersionInfo returns full version report.
func FullVersionInfo() string {
	out := []string{
		"ProjectName: " + ProjectName,
		"Version: " + Version,
		"FullCommit: " + FullCommit,
	}
	return strings.Join(out, "\n")
}

// FullVersionJSON returns version info as JSON.
func FullVersionJSON() (string, error) {
	res := map[string]string{
		"projectName": ProjectName,
		"version":     Version,
		"fullCommit":  FullCommit,
	}
	data, err := json.Marshal(res)
	return string(data), err
}
