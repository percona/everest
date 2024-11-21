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

	everesthelmchart "github.com/percona/percona-helm-charts/charts/everest"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"
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
	// We need to copy the contents of the embed.FS to the temporary directory
	// so that we're able to use the Helm SDK to build the chart dependencies.
	// Currently Helm SDK does not support reading a chart from embed.FS to build dependencies.
	if err := copyEmbedFSToDir(everesthelmchart.Chart, tmp); err != nil {
		if removeErr := os.RemoveAll(tmp); removeErr != nil {
			return "", errors.Join(err, removeErr)
		}
		return "", err
	}
	return tmp, nil
}

func StringsToBytes(strs []string) []byte {
	var res []byte
	for _, s := range strs {
		b := []byte(s)
		res = append(res, b...)
	}
	return res
}
