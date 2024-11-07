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
	"strings"

	version "github.com/hashicorp/go-version"
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
)

// IsRC returns true if the version is a release candidate.
func IsRC() bool {
	return isRC(Version)
}

func isRC(v string) bool {
	if v == "" {
		return false
	}
	ver := version.Must(version.NewVersion(v))
	return strings.Contains(ver.Prerelease(), "rc")
}

// IsDev returns true if the version is a development version.
func IsDev() bool {
	return isDev(Version)
}

func isDev(v string) bool {
	if v == "" {
		return false
	}
	ver := version.Must(version.NewVersion(v))
	devLatestVer := version.Must(version.NewVersion("v0.0.0"))
	return ver.Core().Equal(devLatestVer)
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
