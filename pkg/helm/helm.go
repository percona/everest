package helm

import (
	"bytes"
	"context"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"

	"github.com/percona/everest/pkg/common"
	"github.com/pkg/errors"
	"helm.sh/helm/pkg/ignore"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/cli-runtime/pkg/genericclioptions"
)

var utf8bom = []byte{0xEF, 0xBB, 0xBF}

// ChartOptions are the options for the Helm chart.
type ChartOptions struct {
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

// Manager manages a Helm chart on Kubernetes.
type Manager struct {
	chart                         *chart.Chart
	actionsCfg                    *action.Configuration
	releaseName, releaseNamespace string
}

// New returns a new Manager for Helm.
func New(o ChartOptions) (*Manager, error) {
	var chartFS fs.FS
	if o.Directory != "" {
		chartFS = os.DirFS(o.Directory)
	}
	chart, err := resolveHelmChart(o.Version, o.Name, o.URL, chartFS)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve helm chart: %w", err)
	}

	actionsCfg, err := newActionsCfg()
	if err != nil {
		return nil, fmt.Errorf("cannot initialize actions config: %w", err)
	}
	return &Manager{
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
	DisableHooks    bool
	DryRun          bool
}

// Install the Helm chart. If the chart is already installed, it will be overwritten.
func (m *Manager) Install(ctx context.Context, installOpts InstallOptions) error {
	release, err := action.NewGet(m.actionsCfg).Run(m.releaseName)
	if err != nil {
		// Release does not exist, we will create a new installation.
		if errors.Is(err, driver.ErrReleaseNotFound) {
			return m.install(ctx, installOpts)
		}
		return err
	}
	// Release already exists, we will re-apply the manifests by upgrading.
	// We're not actually upgrading the chart to a new version here, Helm expects
	// us to upgrade the chart to the same version in order to re-apply the manifests.
	u := &Manager{
		chart:            release.Chart,
		actionsCfg:       m.actionsCfg,
		releaseName:      release.Name,
		releaseNamespace: release.Namespace,
	}
	return u.Upgrade(ctx)
}

// Upgrade the Helm chart managed by the manager.
func (m *Manager) Upgrade(ctx context.Context) error {
	upgrade := action.NewUpgrade(m.actionsCfg)
	upgrade.Namespace = m.releaseNamespace
	upgrade.TakeOwnership = true
	upgrade.DisableHooks = true

	if _, err := upgrade.RunWithContext(ctx, m.releaseName, m.chart, nil); err != nil {
		return fmt.Errorf("cannot upgrade chart: %w", err)
	}
	return nil
}

// Uninstall a Helm release.
func (m *Manager) Uninstall(ctx context.Context) error {
	uninstall := action.NewUninstall(m.actionsCfg)
	uninstall.DisableHooks = true
	uninstall.Wait = false
	uninstall.IgnoreNotFound = true
	if _, err := uninstall.Run(m.releaseName); err != nil {
		return err
	}
	return nil
}

func (m *Manager) install(ctx context.Context, o InstallOptions) error {
	install := action.NewInstall(m.actionsCfg)
	install.ReleaseName = m.releaseName
	install.Namespace = m.releaseNamespace
	install.CreateNamespace = o.CreateNamespace
	install.DryRun = o.DryRun
	install.DisableHooks = o.DisableHooks
	install.Wait = false

	if _, err := install.RunWithContext(ctx, m.chart, o.Values); err != nil {
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
	return &cfg, nil
}

// LoadFS loads a Helm chart from a filesystem. Works with embedded FS.
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
			return errors.Wrapf(err, "error reading %s", n)
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
		actionConfig := new(action.Configuration)
		pull := action.NewPullWithOpts(action.WithConfig(actionConfig))
		pull.Settings = helmcli.New()
		pull.Version = version
		pull.DestDir = cacheDir
		pull.RepoURL = repository
		if _, err = pull.Run(name); err != nil {
			return nil, err
		}
	}

	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return loader.LoadArchive(f)
}

func everestctlCacheDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}

	res := path.Join(cacheDir, "everestctl")
	err = os.MkdirAll(res, 0o755)
	if err != nil && !os.IsExist(err) {
		return "", err
	}
	return res, nil
}
