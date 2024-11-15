package helm

import (
	"errors"
	"fmt"

	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"sigs.k8s.io/yaml"

	"github.com/percona/everest/pkg/cli/helm/utils"
)

// GetEverestCatalogSource returns the Everest catalog source.
func (i *Installer) GetEverestCatalogSource() (*olmv1alpha1.CatalogSource, error) {
	rendered := utils.RenderedTemplates{}
	if err := rendered.FromString(i.release.Manifest, false); err != nil {
		return nil, fmt.Errorf("failed to parse rendered templates: %w", err)
	}
	file := rendered.Filter("everest-catalogsource.yaml")
	if len(file.Files()) > 1 {
		return nil, errors.New("invalid filter: more than one catalog source found")
	}

	cs := &olmv1alpha1.CatalogSource{}
	if err := yaml.Unmarshal(file, cs); err != nil {
		return nil, fmt.Errorf("failed to unmarshal catalog source: %w", err)
	}
	return cs, nil
}
