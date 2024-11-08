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
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"helm.sh/helm/pkg/ignore"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	helmcli "helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/releaseutil"

	// "helm.sh/helm/v3/pkg/releaseutil"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/cli-runtime/pkg/genericclioptions"

	"github.com/percona/everest/pkg/kubernetes"
)

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
	// If set, FS and URL are ignored.
	Directory string
	// FS is the filesystem to load the Helm chart from.
	// If set, URL is ignored.
	FS fs.FS
	// URL of the repository to pull the chart from.
	URL string
	// Version of the helm chart to install.
	Version string
	// Name of the Helm chart to install.
	Name string
}

// Installer installs a Helm chart in a single namespace.
type Installer struct {
	namespace  string
	chart      *chart.Chart
	getter     *Getter
	actionsCfg *action.Configuration
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
	var chartFS fs.FS
	if o.Directory != "" {
		chartFS = os.DirFS(o.Directory)
	} else if o.FS != nil {
		chartFS = o.FS
	} else if o.URL == "" {
		return nil, errors.New("either directory, fs or url must be set")
	}

	chart, err := resolveHelmChart(o.Version, o.Name, o.URL, chartFS)
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
		getter: &Getter{
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
func (i *Installer) Install(ctx context.Context, args InstallArgs) error {
	release, err := i.getter.Get(args.ReleaseName)
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

// FilterYAML filters the given YAML file by the provided paths.
// Pass the output of RenderTemplates to this function.
func FilterYAML(file []byte, paths ...string) ([]byte, error) {
	manifestNameRegex := regexp.MustCompile("# Source: [^/]+/(.+)")
	split := releaseutil.SplitManifests(string(file))
	var builder strings.Builder
	for _, y := range split {
		for _, p := range paths {
			submatch := manifestNameRegex.FindStringSubmatch(y)
			if len(submatch) == 0 || submatch[1] != p {
				continue
			}
			builder.WriteString("\n---\n" + y)
		}
	}
	rendered := builder.String()
	rendered = strings.TrimPrefix(rendered, "\n---\n")
	return []byte(rendered), nil
}

// RenderTemplates renders the Helm chart templates and returns a single YAML file.
func (i *Installer) RenderTemplates(ctx context.Context, uninstall bool, args InstallArgs) ([]byte, error) {
	args.DryRun = true
	rel, err := i.install(ctx, args)
	if err != nil {
		return nil, err
	}
	split := releaseutil.SplitManifests(rel.Manifest)
	if uninstall {
		_, files, err := releaseutil.SortManifests(split, nil, releaseutil.UninstallOrder)
		if err != nil {
			return nil, fmt.Errorf("cannot sort manifests: %w", err)
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
	return []byte(rendered), nil
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
		restClientGetter.KubeConfig = &kubeconfig
	}
	if err := cfg.Init(&restClientGetter, namespace, "", logger); err != nil {
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
	merged, err := userDefined.MergeValues(getter.All(cli.New()))
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

// ClusterTypeSpecificValues returns value overrides based on the Kubernetes cluster type.
func ClusterTypeSpecificValues(ct kubernetes.ClusterType) map[string]interface{} {
	if ct == kubernetes.ClusterTypeOpenShift {
		return map[string]interface{}{
			"compatibility.openshift": true,
		}
	}
	return nil
}
