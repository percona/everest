package helm

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/releaseutil"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"
)

type TemplateRenderer struct {
	chart                 *chart.Chart
	cfg                   *action.Configuration
	relName, relNamespace string
	values                map[string]interface{}
}

func (r *TemplateRenderer) GetCRDs(ctx context.Context) ([]string, error) {
	return r.filterRender(ctx, "crds")
}

func (r *TemplateRenderer) GetEverestCatalogNamespace(ctx context.Context) (string, error) {
	objs, err := r.filterRender(ctx, "everest-catalogsource.yaml")
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

func (r *TemplateRenderer) GetAllManifests(ctx context.Context, uninstall bool) (string, error) {
	if uninstall {
		return r.renderUninstall(ctx)
	}
	return r.renderTemplates(ctx)
}

func (r *TemplateRenderer) renderUninstall(ctx context.Context) (string, error) {
	manifests, err := r.renderTemplates(ctx)
	if err != nil {
		return "", err
	}
	split := releaseutil.SplitManifests(manifests)
	_, files, err := releaseutil.SortManifests(split, nil, releaseutil.UninstallOrder)
	if err != nil {
		return "", err
	}
	var builder strings.Builder
	for _, file := range files {
		builder.WriteString(file.Content + "\n---\n")
	}
	y := builder.String()
	y = strings.TrimSuffix(y, "\n---\n")
	return y, nil
}

func (r *TemplateRenderer) renderTemplates(ctx context.Context) (string, error) {
	install := action.NewInstall(r.cfg)
	install.ReleaseName = r.relName
	install.Namespace = r.relNamespace
	install.DisableHooks = true
	install.IncludeCRDs = true
	install.DryRun = true
	install.Replace = true

	rel, err := install.RunWithContext(ctx, r.chart, r.values)
	if err != nil {
		return "", err
	}
	return rel.Manifest, nil
}

func (r *TemplateRenderer) filterRender(ctx context.Context, path string) ([]string, error) {
	manifests, err := r.renderTemplates(ctx)
	if err != nil {
		return nil, err
	}
	split := splitYaml(manifests)
	result := []string{}

	sourcePathRegex := regexp.MustCompile("# Source: [^/]+/(.+)")
	sourcePath := ""
	for _, doc := range split {
		match := sourcePathRegex.FindStringSubmatch(doc)
		if len(match) > 0 {
			sourcePath = match[1]
		}
		if sourcePath == "" {
			return nil, fmt.Errorf("cannot determine source path for manifest")
		}
		if strings.Contains(sourcePath, path) {
			result = append(result, doc)
		}
	}
	return result, nil
}

func splitYaml(y string) []string {
	res := []string{}
	// Making sure that any extra whitespace in YAML stream doesn't interfere in splitting documents correctly.
	bigFileTmp := strings.TrimSpace(y)
	sep := regexp.MustCompile("(?:^|\\s*\n)---\\s*")
	docs := sep.Split(bigFileTmp, -1)
	for _, d := range docs {
		if d == "" {
			continue
		}

		d = strings.TrimSpace(d)
		res = append(res, d)
	}
	return res
}
