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

// Package helm contains the logic to install and uninstall Helm charts.
package helm

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"

	everesthelmchart "github.com/percona/percona-helm-charts/charts/everest"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/downloader"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/cli-runtime/pkg/genericclioptions"

	helmutils "github.com/percona/everest/pkg/helm/utils"
	"github.com/percona/everest/pkg/kubernetes"
)

var settings = helmcli.New() //nolint:gochecknoglobals

// CLIOptions contains common options for the CLI.
type CLIOptions struct {
	ChartDir string
	RepoURL  string
	Values   values.Options
	Devel    bool
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
	// Directory to load the Helm chart from.
	// If set, ignores URL.
	Directory string
	// URL of the repository to pull the chart from.
	URL string
	// Version of the helm chart to install.
	// If loading from a directory, needs to match the chart version.
	Version string
	// Name of the Helm chart to install.
	// Required only if pulling from the specified URL.
	Name string
}

// Installer installs a Helm chart in a single namespace.
type Installer struct {
	namespace  string
	chart      *chart.Chart
	actionsCfg *action.Configuration
	*Getter
}

// Uninstaller uninstalls a Helm chart.
type Uninstaller struct {
	namespace  string
	actionsCfg *action.Configuration
}

// Getter gets a Helm release.
type Getter struct {
	namespace  string
	actionsCfg *action.Configuration
}

// NewGetter initialises a new Helm chart getter for the given namespace.
func NewGetter(namespace, kubeconfigPath string) (*Getter, error) {
	actionsCfg, err := newActionsCfg(namespace, kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("cannot create action configuration: %w", err)
	}
	return &Getter{
		namespace:  namespace,
		actionsCfg: actionsCfg,
	}, nil
}

// Get a Helm release.
func (g *Getter) Get(releaseName string) (*release.Release, error) {
	return action.NewGet(g.actionsCfg).Run(releaseName)
}

// NewInstaller initialises a new Helm chart installer for the given namespace.
func NewInstaller(namespace, kubeconfigPath string, o ChartOptions) (*Installer, error) {
	if o.Directory == "" && o.URL == "" {
		return nil, errors.New("either chart directory or URL must be set")
	}

	if o.Version == "" {
		return nil, errors.New("chart version must be set")
	}

	chart, err := resolveHelmChart(o.Version, o.Name, o.URL, o.Directory)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve helm chart: %w", err)
	}

	actionsCfg, err := newActionsCfg(namespace, kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("cannot create action configuration: %w", err)
	}

	return &Installer{
		chart:      chart,
		namespace:  namespace,
		actionsCfg: actionsCfg,
		Getter: &Getter{
			namespace:  namespace,
			actionsCfg: actionsCfg,
		},
	}, nil
}

// NewUninstaller initialises a new Helm chart uninstaller for the given namespace.
func NewUninstaller(namespace, kubeconfigPath string) (*Uninstaller, error) {
	actionsCfg, err := newActionsCfg(namespace, kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("cannot create action configuration: %w", err)
	}
	return &Uninstaller{
		namespace:  namespace,
		actionsCfg: actionsCfg,
	}, nil
}

// InstallArgs provides options for the helm installation.
type InstallArgs struct {
	Values          map[string]interface{}
	CreateNamespace bool
	DryRun          bool
	Devel           bool
	Wait            bool
	ReleaseName     string
}

// Install the Helm chart.
// Calling Install multiple times is idempotent; it will re-apply the manifests using upgrade.
func (i *Installer) Install(ctx context.Context, args InstallArgs) error {
	release, err := i.Get(args.ReleaseName)
	if err != nil {
		// Release does not exist, we will create a new installation.
		if errors.Is(err, driver.ErrReleaseNotFound) {
			_, err = i.install(ctx, args)
			return err
		}
		return err
	}
	// If the release already exists, we will re-apply the manifests using upgrade.
	// We're not actually upgrading to a new version, but using upgrade to re-apply manifests.
	// This is how Helm expects us to re-apply manifests.
	// To prevent accidental version upgrades, we will explicitly check that the resolved chart version matches the installed chart version.
	if i.chart.Metadata.Version != release.Chart.Metadata.Version {
		return fmt.Errorf("cannot overwrite existing release with a different chart version. Expected %s, got %s",
			release.Chart.Metadata.Version, i.chart.Metadata.Version,
		)
	}
	return i.Upgrade(ctx, args)
}

// RenderTemplates renders the Helm chart templates and returns a single YAML file.
func (i *Installer) RenderTemplates(ctx context.Context, uninstall bool, args InstallArgs) (helmutils.RenderedTemplates, error) {
	args.DryRun = true
	rel, err := i.install(ctx, args)
	if err != nil {
		return nil, err
	}
	rendered := helmutils.RenderedTemplates{}
	if err := rendered.FromString(rel.Manifest, uninstall); err != nil {
		return nil, err
	}
	return rendered, nil
}

// Upgrade the Helm chart managed by the manager.
func (i *Installer) Upgrade(ctx context.Context, args InstallArgs) error {
	upgrade := action.NewUpgrade(i.actionsCfg)
	upgrade.Namespace = i.namespace
	upgrade.TakeOwnership = true
	upgrade.DisableHooks = true
	upgrade.Devel = args.Devel
	if _, err := upgrade.RunWithContext(ctx, args.ReleaseName, i.chart, args.Values); err != nil {
		return fmt.Errorf("cannot upgrade chart: %w", err)
	}
	return nil
}

// Uninstall a Helm release.
func (u *Uninstaller) Uninstall(releaseName string) error {
	uninstall := action.NewUninstall(u.actionsCfg)
	uninstall.DisableHooks = true
	uninstall.Wait = false
	uninstall.IgnoreNotFound = true
	if _, err := uninstall.Run(releaseName); err != nil {
		return err
	}
	return nil
}

func (i *Installer) install(ctx context.Context, args InstallArgs) (*release.Release, error) {
	install := action.NewInstall(i.actionsCfg)
	install.ReleaseName = args.ReleaseName
	install.Namespace = i.namespace
	install.CreateNamespace = args.CreateNamespace
	install.DryRun = args.DryRun
	install.DisableHooks = true
	install.Wait = false
	install.Devel = args.Devel
	install.TakeOwnership = true

	return install.RunWithContext(ctx, i.chart, args.Values)
}

func newActionsCfg(namespace, kubeconfig string) (*action.Configuration, error) {
	logger := func(_ string, _ ...interface{}) {}
	cfg := action.Configuration{}
	restClientGetter := genericclioptions.ConfigFlags{}
	if kubeconfig != "" {
		home := os.Getenv("HOME")
		kubeconfig = strings.ReplaceAll(kubeconfig, "~", home)
		restClientGetter.KubeConfig = &kubeconfig
	}
	if err := cfg.Init(&restClientGetter, namespace, "", logger); err != nil {
		return nil, err
	}
	cfg.Releases.MaxHistory = 3
	return &cfg, nil
}

func resolveHelmChart(version, chartName, repoURL, dir string) (*chart.Chart, error) {
	if dir != "" {
		return resolveDir(version, dir)
	}
	return resolveRepo(version, chartName, repoURL)
}

func resolveDir(version, dir string) (*chart.Chart, error) {
	if err := buildChartDeps(dir); err != nil {
		return nil, err
	}
	chart, err := loader.LoadDir(dir)
	if err != nil {
		return nil, err
	}
	// When loading from a directory, ensure that the loaded chart version
	// matches the specified version.
	if chart.Metadata.Version != version {
		return nil, fmt.Errorf("chart version does not match specified version."+
			"Expected chart version %s, got %s", version, chart.Metadata.Version,
		)
	}
	return chart, nil
}

func resolveRepo(version, chartName, repoURL string) (*chart.Chart, error) {
	// Download Helm chart from repo and cache it for later use.
	chart, err := newChartFromRemoteWithCache(version, chartName, repoURL)
	if err != nil {
		return nil, err
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
		pull.Settings = settings
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

// ClusterTypeSpecificValues returns value overrides based on the Kubernetes cluster type.
func ClusterTypeSpecificValues(ct kubernetes.ClusterType) map[string]interface{} {
	if ct == kubernetes.ClusterTypeOpenShift {
		return map[string]interface{}{
			"compatibility.openshift": true,
		}
	}
	return nil
}

// Runs `helm dependency build` in the chart directory.
func buildChartDeps(chartDir string) error {
	man := &downloader.Manager{
		Out:              io.Discard,
		ChartPath:        chartDir,
		Getters:          getter.All(settings),
		RepositoryConfig: settings.RepositoryConfig,
		RepositoryCache:  settings.RepositoryCache,
	}
	return man.Build()
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
