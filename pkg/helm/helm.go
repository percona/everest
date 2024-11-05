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
// Package install holds the main logic for installation commands.

// Package helm ...
package helm

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"

	"helm.sh/helm/pkg/ignore"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/releaseutil"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/cli-runtime/pkg/genericclioptions"

	"github.com/percona/everest/pkg/common"
)

// CLIOptions contains common options for the CLI.
type CLIOptions struct {
	ChartDir          string
	RepoURL           string
	Values            values.Options
	DBNamespaceValues values.Options
	Devel             bool
}

// Everest Helm chart names.
const (
	EverestChartName            = "everest"
	EverestDBNamespaceChartName = "everest-db-namespace"
)

// DefaultHelmRepoURL is the default Helm repository URL to download the Everest charts.
const DefaultHelmRepoURL = "https://percona.github.io/percona-helm-charts/"

// ChartOptions are the options for the Helm chart.
type ChartOptions struct {
	// FS is the filesystem to load the Helm chart from.
	// If set, ignored Directory, URL and Name.
	FS fs.GlobFS
	// Directory to load the Helm chart from.
	// If set, URL and Name are ignored.
	Directory string
	// Version of the helm chart.
	Version string
	// URL of the chart repository.
	URL string
	// Name of the Helm chart to install.
	Name string
	// ReleaseName of the Helm chart to install.
	ReleaseName string
	// ReleaseNamespace of the Helm chart to install.
	ReleaseNamespace string
}

// Driver provides a simple interface for managing Everest Helm charts.
type Driver struct {
	chart                         *chart.Chart
	actionsCfg                    *action.Configuration
	releaseName, releaseNamespace string
}

// DefaultDriver is the default pre-defined Helm driver.
var DefaultDriver *Driver

// Init initializes the default Helm driver.
func Init(o ChartOptions) {
	if o.ReleaseName == "" {
		o.ReleaseName = common.SystemNamespace
	}
	if o.ReleaseNamespace == "" {
		o.ReleaseNamespace = common.SystemNamespace
	}
	d, err := New(o)
	if err != nil {
		panic(err)
	}
	DefaultDriver = d
}

// New creates a new Helm driver.
func New(o ChartOptions) (*Driver, error) {
	var chartFS fs.FS
	if o.Directory != "" {
		chartFS = os.DirFS(o.Directory)
	} else if o.FS != nil {
		chartFS = o.FS
	}

	chart, err := resolveHelmChart(o.Version, o.Name, o.URL, chartFS)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve helm chart: %w", err)
	}

	actionsCfg, err := newActionsCfg()
	if err != nil {
		return nil, fmt.Errorf("cannot initialize actions config: %w", err)
	}
	return &Driver{
		chart:            chart,
		actionsCfg:       actionsCfg,
		releaseName:      o.ReleaseName,
		releaseNamespace: o.ReleaseNamespace,
	}, nil
}

// InstallOptions provides options for the helm installation.
type InstallOptions struct {
	Values          map[string]interface{}
	CreateNamespace bool
	DryRun          bool
	Devel           bool
}

// Get an installed Helm release.
func (d *Driver) Get() (*release.Release, error) {
	return action.NewGet(d.actionsCfg).Run(d.releaseName)
}

// Manifests returns the Helm chart manifests.
func (d *Driver) Manifests(uninstall bool) ([]byte, error) {
	rel, err := d.Get()
	if err != nil {
		return nil, fmt.Errorf("cannot get release: %w", err)
	}
	manifests := releaseutil.SplitManifests(rel.Manifest)
	if uninstall {
		_, files, err := releaseutil.SortManifests(manifests, nil, releaseutil.UninstallOrder)
		if err != nil {
			return nil, fmt.Errorf("cannot sort manifests: %w", err)
		}
		result := make([]byte, 0, len(files))
		for _, f := range files {
			result = append(result, []byte(f.Content)...)
		}
		return result, nil
	}
	result := make([]byte, 0, len(manifests))
	for _, f := range manifests {
		result = append(result, []byte(f)...)
	}
	return result, nil
}

// Install the Helm chart. If the chart is already installed, it will be overwritten.
func (d *Driver) Install(ctx context.Context, installOpts InstallOptions) error {
	release, err := d.Get()
	if err != nil {
		// Release does not exist, we will create a new installation.
		if errors.Is(err, driver.ErrReleaseNotFound) {
			return d.install(ctx, installOpts)
		}
		return err
	}
	// If the release already exists, we will re-apply the manifests using upgrade.
	// We're not actually upgrading to a new version, but using upgrade to re-apply manifests.
	// This is how Helm expects us to re-apply manifests.
	// To prevent accidental version upgrades, we will explicitly check that the resolved chart version matches the installed chart version.
	if d.chart.Metadata.Version != release.Chart.Metadata.Version {
		return fmt.Errorf("cannot overwrite existing release with a different chart version. Expected %s, got %s",
			release.Chart.Metadata.Version, d.chart.Metadata.Version,
		)
	}
	u := &Driver{
		chart:            d.chart,
		actionsCfg:       d.actionsCfg,
		releaseName:      release.Name,
		releaseNamespace: release.Namespace,
	}
	return u.Upgrade(ctx, installOpts)
}

// Upgrade the Helm chart managed by the manager.
func (d *Driver) Upgrade(ctx context.Context, opts InstallOptions) error {
	upgrade := action.NewUpgrade(d.actionsCfg)
	upgrade.Namespace = d.releaseNamespace
	upgrade.TakeOwnership = true
	upgrade.DisableHooks = true
	upgrade.Devel = opts.Devel
	if _, err := upgrade.RunWithContext(ctx, d.releaseName, d.chart, opts.Values); err != nil {
		return fmt.Errorf("cannot upgrade chart: %w", err)
	}
	return nil
}

// Uninstall a Helm release.
func (d *Driver) Uninstall() error {
	uninstall := action.NewUninstall(d.actionsCfg)
	uninstall.DisableHooks = true
	uninstall.Wait = false
	uninstall.IgnoreNotFound = true
	if _, err := uninstall.Run(d.releaseName); err != nil {
		return err
	}
	return nil
}

func (d *Driver) install(ctx context.Context, o InstallOptions) error {
	install := action.NewInstall(d.actionsCfg)
	install.ReleaseName = d.releaseName
	install.Namespace = d.releaseNamespace
	install.CreateNamespace = o.CreateNamespace
	install.DryRun = o.DryRun
	install.DisableHooks = true
	install.Wait = false
	install.Devel = o.Devel

	if _, err := install.RunWithContext(ctx, d.chart, o.Values); err != nil {
		return fmt.Errorf("cannot install chart: %w", err)
	}
	return nil
}

func newActionsCfg() (*action.Configuration, error) {
	logger := func(_ string, _ ...interface{}) {}
	cfg := action.Configuration{}
	if err := cfg.Init(&genericclioptions.ConfigFlags{}, common.SystemNamespace, "", logger); err != nil {
		return nil, err
	}
	cfg.Releases.MaxHistory = 3
	return &cfg, nil
}

var utf8bom = []byte{0xEF, 0xBB, 0xBF} //nolint:gochecknoglobals

// LoadFS loads a Helm chart from a filesystem. Works with embedded FS.
//
//nolint:funlen
func LoadFS(fsys fs.FS) (*chart.Chart, error) {
	c := &chart.Chart{}
	rules := ignore.Empty()
	if ifile, err := fsys.Open(ignore.HelmIgnore); err == nil {
		r, err := ignore.Parse(ifile)
		if err != nil {
			return c, err
		}
		rules = r
	}
	rules.AddDefaults()
	files := []*loader.BufferedFile{}
	walk := func(path string, d fs.DirEntry, err error) error {
		if path == "." {
			// No need to process top level. Avoid bug with helmignore .* matching
			return nil
		}
		if err != nil {
			return err
		}

		fi, err := d.Info()
		if err != nil {
			return err
		}

		// Normalize to / since it will also work on Windows
		n := filepath.ToSlash(path)
		if fi.IsDir() {
			// Directory-based ignore rules should involve skipping the entire
			// contents of that directory.
			if rules.Ignore(n, fi) {
				return filepath.SkipDir
			}
			return nil
		}

		// If a .helmignore file matches, skip this file.
		if rules.Ignore(n, fi) {
			return nil
		}

		// Irregular files include devices, sockets, and other uses of files that
		// are not regular files. In Go they have a file mode type bit set.
		// See https://golang.org/pkg/os/#FileMode for examples.
		if !fi.Mode().IsRegular() {
			return fmt.Errorf("cannot load irregular file %s as it has file mode type bits set", path)
		}

		data, err := fs.ReadFile(fsys, path)
		if err != nil {
			return errors.Join(err, fmt.Errorf("cannot read file %s", path))
		}

		data = bytes.TrimPrefix(data, utf8bom)
		files = append(files, &loader.BufferedFile{Name: n, Data: data})
		return nil
	}
	if err := fs.WalkDir(fsys, ".", walk); err != nil {
		return c, err
	}
	return loader.LoadFiles(files)
}

func resolveHelmChart(version, chartName, repoURL string, fs fs.FS) (*chart.Chart, error) {
	if fs != nil {
		return resolveFS(version, fs)
	}
	return resolveRepo(version, chartName, repoURL)
}

func resolveRepo(version, chartName, repoURL string) (*chart.Chart, error) {
	chart, err := newChartFromRemoteWithCache(version, chartName, repoURL)
	if err != nil {
		return nil, err
	}
	if chart.Metadata.Version != version {
		return nil, fmt.Errorf("version mismatch: expected %s, got %s", version, chart.Metadata.Version)
	}
	return chart, nil
}

func resolveFS(version string, fs fs.FS) (*chart.Chart, error) {
	chart, err := LoadFS(fs)
	if err != nil {
		return nil, err
	}
	if chart.Metadata.Version != version {
		return nil, fmt.Errorf("version mismatch: expected %s, got %s", version, chart.Metadata.Version)
	}
	return chart, nil
}

// newChartFromRemoteWithCache downloads the chart from the remote repository and caches it.
func newChartFromRemoteWithCache(version, name string, repository string) (*chart.Chart, error) {
	cacheDir, err := everestctlCacheDir()
	if err != nil {
		return nil, err
	}

	file := path.Join(cacheDir, fmt.Sprintf("%s-%s.tgz", name, version))
	if _, err = os.Stat(file); err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			return nil, err
		}

		// Download the chart from remote repository
		actionConfig := &action.Configuration{}
		pull := action.NewPullWithOpts(action.WithConfig(actionConfig))
		pull.Settings = helmcli.New()
		pull.Version = version
		pull.DestDir = cacheDir
		pull.RepoURL = repository
		if _, err = pull.Run(name); err != nil {
			return nil, err
		}
	}

	f, err := os.Open(file) //nolint:gosec
	if err != nil {
		return nil, err
	}
	defer f.Close() //nolint:errcheck
	return loader.LoadArchive(f)
}

func everestctlCacheDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}

	res := path.Join(cacheDir, "everestctl")
	err = os.MkdirAll(res, 0o755) //nolint:gosec,mnd
	if err != nil && !os.IsExist(err) {
		return "", err
	}
	return res, nil
}
