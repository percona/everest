package utils

import (
	"fmt"
	"regexp"
	"strings"

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
