package common

import (
	"helm.sh/helm/v3/pkg/cli/values"
)

// HelmOpts contains common options for installing/upgrading/uninstalling Helm charts via the CLI.
type HelmOpts struct {
	ChartDir          string
	RepoURL           string
	Values            values.Options
	DBNamespaceValues values.Options
}
