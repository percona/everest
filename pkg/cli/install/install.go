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

// Package install ...
package install

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/fatih/color"
	goversion "github.com/hashicorp/go-version"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/cli"
	"github.com/percona/everest/pkg/cli/helm"
	helmutils "github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/cli/steps"
	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
	. "github.com/percona/everest/pkg/utils/must" //nolint:revive,stylecheck
	"github.com/percona/everest/pkg/version"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	pollInterval    = 5 * time.Second
	pollTimeout     = 10 * time.Minute
	backoffInterval = 5 * time.Second

	// DefaultDBNamespaceName is the name of the default DB namespace during installation.
	DefaultDBNamespaceName = "everest"
)

// Install implements the main logic for commands.
type Install struct {
	l *zap.SugaredLogger

	config         Config
	cmd            *cobra.Command
	kubeClient     *kubernetes.Kubernetes
	versionService versionservice.Interface

	// these are set only when Run is called.
	clusterType    kubernetes.ClusterType
	installVersion string
	helmInstaller  *helm.Installer
}

// Config holds the configuration for the install command.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string `mapstructure:"kubeconfig"`
	// VersionMetadataURL stores hostname to retrieve version metadata information from.
	VersionMetadataURL string `mapstructure:"version-metadata-url"`
	// Version defines the version to be installed. If empty, the latest version is installed.
	Version string `mapstructure:"version"`
	// DisableTelemetry disables telemetry.
	DisableTelemetry bool `mapstructure:"disable-telemetry"`
	// SkipEnvDetection skips detecting the Kubernetes environment.
	SkipEnvDetection bool `mapstructure:"skip-env-detection"`
	// If set, we will print the pretty output.
	Pretty bool
	// SkipDBNamespace is set if the installation should skip provisioning database.
	SkipDBNamespace bool `mapstructure:"skip-db-namespace"`

	helm.CLIOptions
	namespaces.NamespaceAddConfig `mapstructure:",squash"`
}

// NewInstall returns a new Install struct.
func NewInstall(c Config, l *zap.SugaredLogger, cmd *cobra.Command) (*Install, error) {
	cli := &Install{
		cmd: cmd,
		l:   l.With("component", "install"),
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}

	c.NamespaceAddConfig.Pretty = false
	c.NamespaceAddConfig.CLIOptions = c.CLIOptions
	c.NamespaceAddConfig.KubeconfigPath = c.KubeconfigPath
	c.NamespaceAddConfig.DisableTelemetry = c.DisableTelemetry
	cli.config = c

	k, err := cliutils.NewKubeclient(cli.l, c.KubeconfigPath)
	if err != nil {
		return nil, err
	}
	cli.kubeClient = k
	cli.versionService = versionservice.New(c.VersionMetadataURL)
	return cli, nil
}

// Run the Everest installation process.
func (o *Install) Run(ctx context.Context) error {
	// Do not continue if Everst is already installed.
	installedVersion, err := version.EverestVersionFromDeployment(ctx, o.kubeClient)
	if client.IgnoreNotFound(err) != nil {
		return errors.Join(err, errors.New("cannot check if Everest is already installed"))
	} else if err == nil {
		return fmt.Errorf("everest is already installed. Version: %s", installedVersion)
	}

	if err := o.setKubernetesEnv(ctx); err != nil {
		return fmt.Errorf("failed to detect Kubernetes environment: %w", err)
	}

	dbInstallStep, err := o.installDBNamespacesStep(ctx)
	if err != nil {
		return fmt.Errorf("could not create db install step: %w", err)
	}

	if err := o.setVersionInfo(ctx); err != nil {
		return fmt.Errorf("failed to get Everest version info: %w", err)
	}

	if version.IsDev(o.installVersion) && o.config.ChartDir == "" {
		cleanup, err := helmutils.SetupEverestDevChart(o.l, &o.config.ChartDir)
		if err != nil {
			return err
		}
		defer cleanup()
	}

	if err := o.setupHelmInstaller(ctx); err != nil {
		return err
	}

	installSteps := o.newInstallSteps()
	if dbInstallStep != nil {
		installSteps = append(installSteps, *dbInstallStep)
	}

	var out io.Writer = os.Stdout
	if !o.config.Pretty {
		out = io.Discard
	}

	// Run steps.
	fmt.Fprintln(out, output.Info("Installing Everest version %s", o.installVersion))
	if err := steps.RunStepsWithSpinner(ctx, installSteps, out); err != nil {
		return err
	}
	o.l.Infof("Everest '%s' has been successfully installed", o.installVersion)
	o.printPostInstallMessage(out)
	return nil
}

func (o *Install) installDBNamespacesStep(ctx context.Context) (*steps.Step, error) {
	askNamespaces := !(o.cmd.Flags().Lookup(cli.FlagNamespaces).Changed || o.config.SkipDBNamespace)
	askOperators := !(o.cmd.Flags().Lookup(cli.FlagOperatorMongoDB).Changed ||
		o.cmd.Flags().Lookup(cli.FlagOperatorPostgresql).Changed ||
		o.cmd.Flags().Lookup(cli.FlagOperatorXtraDBCluster).Changed)

	if askNamespaces {
		o.config.Namespaces = DefaultDBNamespaceName
	}

	if err := o.config.Populate(ctx, askNamespaces, askOperators); err != nil {
		// not specifying a namespace in this context is allowed.
		if errors.Is(err, namespaces.ErrNSEmpty) {
			return nil, nil //nolint:nilnil
		}
		return nil, errors.Join(err, errors.New("namespaces configuration error"))
	}
	o.config.NamespaceAddConfig.ClusterType = o.clusterType
	if o.clusterType != "" || o.config.SkipEnvDetection {
		o.config.NamespaceAddConfig.SkipEnvDetection = true
	}
	i, err := namespaces.NewNamespaceAdd(o.config.NamespaceAddConfig, zap.NewNop().Sugar())
	if err != nil {
		return nil, err
	}
	return &steps.Step{
		Desc: fmt.Sprintf("Provisioning database namespaces (%s)", strings.Join(o.config.NamespaceList, ", ")),
		F: func(ctx context.Context) error {
			return i.Run(ctx)
		},
	}, nil
}

//nolint:gochecknoglobals
var bold = color.New(color.Bold).SprintFunc()

func (o *Install) printPostInstallMessage(out io.Writer) {
	message := "\n" + output.Rocket("Thank you for installing Everest (v%s)!\n", o.installVersion)
	message += "Follow the steps below to get started:\n\n"

	if len(o.config.NamespaceList) == 0 {
		message += bold("PROVISION A NAMESPACE FOR YOUR DATABASE:\n\n")
		message += "Install a namespace for your databases using the following command:\n\n"
		message += "\teverestctl namespaces add [NAMESPACE]"
		message += "\n\n"
	}

	message += bold("RETRIEVE THE INITIAL ADMIN PASSWORD:\n\n")
	message += common.InitialPasswordWarningMessage + "\n\n"

	message += bold("ACCESS THE EVEREST UI:\n\n")
	message += "To access the web UI, set up port-forwarding and visit http://localhost:8080 in your browser:\n\n"
	message += "\tkubectl port-forward -n everest-system svc/everest 8080:8080"
	message += "\n"

	fmt.Fprint(out, message)
}

func (o *Install) setVersionInfo(ctx context.Context) error {
	meta, err := o.versionService.GetEverestMetadata(ctx)
	if err != nil {
		return errors.Join(err, errors.New("could not fetch version metadata"))
	}
	latest, latestMeta, err := o.latestVersion(meta)
	if err != nil {
		return err
	}
	o.l.Debugf("Everest latest version available: %s", latest)
	o.l.Debugf("Everest version information %#v", latestMeta)
	o.installVersion = latest.String()

	supVer, err := common.NewSupportedVersion(latestMeta)
	if err != nil {
		return err
	}
	if err := o.checkRequirements(supVer); err != nil {
		return err
	}
	return nil
}

func (o *Install) checkRequirements(supVer *common.SupportedVersion) error {
	if err := cliutils.VerifyCLIVersion(supVer); err != nil {
		return err
	}
	return nil
}

func (o *Install) setupHelmInstaller(ctx context.Context) error {
	nsExists, err := o.namespaceExists(ctx, common.SystemNamespace)
	if err != nil {
		return err
	}
	overrides := helm.NewValues(helm.Values{
		ClusterType:        o.clusterType,
		VersionMetadataURL: o.config.VersionMetadataURL,
	})
	values := Must(helmutils.MergeVals(o.config.Values, overrides))
	installer := &helm.Installer{
		ReleaseName:            common.SystemNamespace,
		ReleaseNamespace:       common.SystemNamespace,
		Values:                 values,
		CreateReleaseNamespace: !nsExists,
	}
	if err := installer.Init(o.config.KubeconfigPath, helm.ChartOptions{
		Directory: o.config.ChartDir,
		URL:       o.config.RepoURL,
		Name:      helm.EverestChartName,
		Version:   o.installVersion,
	}); err != nil {
		return fmt.Errorf("could not initialize Helm installer: %w", err)
	}
	o.helmInstaller = installer
	return nil
}

func (o *Install) setKubernetesEnv(ctx context.Context) error {
	if o.config.SkipEnvDetection {
		return nil
	}
	t, err := o.kubeClient.GetClusterType(ctx)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}
	o.clusterType = t
	o.l.Infof("Detected Kubernetes environment: %s", t)
	return nil
}

func (o *Install) newInstallSteps() []steps.Step {
	steps := []steps.Step{
		o.newStepInstallEverestHelmChart(),
		o.newStepEnsureEverestAPI(),
		o.newStepEnsureEverestOperator(),
		o.newStepEnsureEverestOLM(),
		o.newStepEnsureCatalogSource(),
		o.newStepEnsureEverestMonitoring(),
	}
	return steps
}

func (o *Install) latestVersion(meta *versionpb.MetadataResponse) (*goversion.Version, *versionpb.MetadataVersion, error) {
	var (
		latest     *goversion.Version
		latestMeta *versionpb.MetadataVersion

		targetVersion *goversion.Version
		err           error
	)

	if o.config.Version != "" {
		targetVersion, err = goversion.NewSemver(o.config.Version)
		if err != nil {
			return nil, nil, errors.Join(err, fmt.Errorf("could not parse target version %q", o.config.Version))
		}
	}

	for _, v := range meta.GetVersions() {
		ver, err := goversion.NewSemver(v.GetVersion())
		if err != nil {
			o.l.Debugf("Could not parse version %s. Error: %s", v.GetVersion(), err)
			continue
		}

		if targetVersion != nil {
			if ver.Equal(targetVersion) {
				return ver, v, nil
			}
		} else {
			if latest == nil || ver.GreaterThan(latest) {
				latest = ver
				latestMeta = v
				continue
			}
		}
	}

	if latest == nil {
		return nil, nil, errors.New("could not determine the latest Everest version")
	}

	return latest, latestMeta, nil
}

func (o *Install) namespaceExists(ctx context.Context, namespace string) (bool, error) {
	_, err := o.kubeClient.GetNamespace(ctx, namespace)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("cannot check if namesapce exists: %w", err)
	}
	return true, nil
}
