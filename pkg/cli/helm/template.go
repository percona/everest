package helm

import (
	"bufio"
	"fmt"
	"regexp"
	"strings"

	"helm.sh/helm/v3/pkg/releaseutil"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"
)

type RenderedTemplate []string

func newRenderedTemplate(y string) RenderedTemplate {
	return splitYaml(y)
}

func (t *RenderedTemplate) Strings() []string {
	if t == nil {
		return []string{}
	}
	return []string(*t)
}

func (t *RenderedTemplate) GetCRDs() ([]string, error) {
	return t.filter("crds")
}

func (r *RenderedTemplate) GetEverestCatalogNamespace() (string, error) {
	objs, err := r.filter("everest-catalogsource.yaml")
	if err != nil {
		return "", err
	}
	if len(objs) == 0 {
		return "", fmt.Errorf("no everest-catalogsource.yaml found")
	}
	m := make(map[string]interface{})
	if err := yaml.Unmarshal([]byte(objs[0]), &m); err != nil {
		return "", err
	}
	cs := &unstructured.Unstructured{Object: m}
	return cs.GetNamespace(), nil
}

func (t *RenderedTemplate) GetUninstallManifests() (RenderedTemplate, error) {
	combined := strings.Join(t.Strings(), "\n---\n")
	split := releaseutil.SplitManifests(combined)
	_, files, err := releaseutil.SortManifests(split, nil, releaseutil.UninstallOrder)
	if err != nil {
		return RenderedTemplate{}, fmt.Errorf("failed to sort manifests: %w", err)
	}
	result := []string{}
	for _, file := range files {
		result = append(result, file.Content)
	}
	return RenderedTemplate(result), nil
}

func (t *RenderedTemplate) filter(path string) (RenderedTemplate, error) {
	sourcePathRegex := regexp.MustCompile("# Source: [^/]+/(.+)")
	sourcePath := ""
	result := []string{}
	for _, doc := range t.Strings() {
		match := sourcePathRegex.FindStringSubmatch(doc)
		if len(match) > 0 {
			sourcePath = match[1]
		}
		if sourcePath == "" {
			return RenderedTemplate{}, fmt.Errorf("cannot determine source path for manifest")
		}
		if strings.Contains(sourcePath, path) {
			result = append(result, doc)
		}
	}
	return RenderedTemplate(result), nil
}

func splitYaml(y string) []string {
	res := []string{}
	// Making sure that any extra whitespace in YAML stream doesn't interfere in splitting documents correctly.
	bigFileTmp := strings.TrimSpace(y)
	sep := regexp.MustCompile("(?:^|\\s*\n)---\\s*")
	docs := sep.Split(bigFileTmp, -1)
	for _, d := range docs {
		if isYamlEmpty(d) {
			continue
		}

		d = strings.TrimSpace(d)
		res = append(res, d)
	}
	return res
}

func isYamlEmpty(y string) bool {
	scanner := bufio.NewScanner(strings.NewReader(y))
	empty := true

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "#") {
			continue
		}
		empty = false
		break
	}

	if err := scanner.Err(); err != nil {
		empty = false
	}
	return empty
}
