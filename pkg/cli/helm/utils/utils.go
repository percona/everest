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

// Package utils provides utility functions for the Helm.
package utils

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	everesthelmchart "github.com/percona/percona-helm-charts/charts/everest"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/releaseutil"
)

// MustMergeValues panics if MergeValues returns an error.
func MustMergeValues(userDefined values.Options, vals ...map[string]interface{}) map[string]interface{} {
	merged, err := MergeValues(userDefined, vals...)
	if err != nil {
		panic(err)
	}
	return merged
}

// MergeValues merges the user-provided values with the provided values `vals`
// If a key exists in both the user-provided values and the provided values, the user-provided value will be used.
func MergeValues(userDefined values.Options, vals ...map[string]interface{}) (map[string]interface{}, error) {
	merged, err := userDefined.MergeValues(getter.All(helmcli.New()))
	if err != nil {
		return nil, fmt.Errorf("failed to merge user-defined values: %w", err)
	}
	for _, val := range vals {
		for k, v := range val {
			if _, ok := merged[k]; !ok {
				merged[k] = v
			}
		}
	}
	return merged, nil
}

// RenderedTemplates is a representation of the rendered templates.
// It is a single YAML file containing all the rendered templates.
// The YAML file is separated by `---` between each template.
type RenderedTemplates []byte

// FromString parses the provided manifest and sets the rendered templates.
func (t *RenderedTemplates) FromString(manifest string, uninstallOrd bool) error {
	split := releaseutil.SplitManifests(manifest)
	if uninstallOrd {
		_, files, err := releaseutil.SortManifests(split, nil, releaseutil.UninstallOrder)
		if err != nil {
			return fmt.Errorf("cannot sort manifests: %w", err)
		}
		split = make(map[string]string)
		for i, f := range files {
			split[fmt.Sprintf("manifest-%d", i)] = f.Content
		}
	}
	var builder strings.Builder
	for _, y := range split {
		builder.WriteString("\n---\n" + y)
	}
	rendered := builder.String()
	rendered = strings.TrimPrefix(rendered, "\n---\n")
	*t = []byte(rendered)
	return nil
}

func fileMapToBytes(files map[string]string) []byte {
	var builder strings.Builder
	for _, doc := range files {
		builder.WriteString(doc + "\n---\n")
	}
	return []byte(strings.TrimSuffix(builder.String(), "\n---\n"))
}

// Filter the rendered templates by the provided paths.
func (t *RenderedTemplates) Filter(paths ...string) RenderedTemplates {
	files := t.Files()
	result := make(map[string]string)
	for name, doc := range files {
		for _, p := range paths {
			if strings.Contains(name, p) {
				result[name] = doc
			}
		}
	}
	return RenderedTemplates(fileMapToBytes(result))
}

// Files returns the rendered templates as a map of file names to their content.
func (t RenderedTemplates) Files() map[string]string {
	sep := regexp.MustCompile("(?:^|\\s*\n)---\\s*")
	manifestNameRegex := regexp.MustCompile("# Source: [^/]+/(.+)")
	docs := sep.Split(string(t), -1)
	result := make(map[string]string)
	for _, doc := range docs {
		fileName := manifestNameRegex.FindStringSubmatch(doc)
		if len(fileName) == 0 || doc == "" {
			continue
		}
		result[fileName[1]] = doc
	}
	return result
}

// copies the contents of src embed.FS to the dest directory.
func copyEmbedFSToDir(src embed.FS, dest string) error {
	return fs.WalkDir(src, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		targetPath := filepath.Join(dest, path)
		if d.IsDir() {
			if err := os.MkdirAll(targetPath, os.ModePerm); err != nil { //nolint:gosec
				return err
			}
		} else {
			data, err := src.ReadFile(path)
			if err != nil {
				return err
			}

			if err := os.WriteFile(targetPath, data, os.ModePerm); err != nil { //nolint:gosec
				return err
			}
		}
		return nil
	})
}

// DevChartDir returns a temporary directory with the Everest Helm chart files
// from the main branch of the [percona-helm-charts](https://github.com/percona/percona-helm-charts) repository.
// It copies the files from the exported embed.FS into a temporary directory.
// The caller is responsible for cleaning up the directory.
func DevChartDir() (string, error) {
	tmp, err := os.MkdirTemp("", "everest-dev-chart")
	if err != nil {
		return "", err
	}
	if err := copyEmbedFSToDir(everesthelmchart.Chart, tmp); err != nil {
		if removeErr := os.RemoveAll(tmp); removeErr != nil {
			return "", errors.Join(err, removeErr)
		}
		return "", err
	}
	return tmp, nil
}
