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
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/AlecAivazis/survey/v2"
	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/cenkalti/backoff/v4"
	goversion "github.com/hashicorp/go-version"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"helm.sh/helm/v3/pkg/cli/values"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/cli/helm"
	helmutils "github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
	"github.com/percona/everest/pkg/version"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	// DefaultEverestNamespace is the default namespace managed by everest Everest.
	DefaultEverestNamespace = "everest"

	// FlagOperatorPostgresql represents the pg operator flag.
	FlagOperatorPostgresql = "operator.postgresql"
	// FlagOperatorXtraDBCluster represents the pxc operator flag.
	FlagOperatorXtraDBCluster = "operator.xtradb-cluster"
	// FlagOperatorMongoDB represents the psmdb operator flag.
	FlagOperatorMongoDB = "operator.mongodb"
	// FlagNamespaces represents the namespaces flag.
	FlagNamespaces = "namespaces"
	// FlagVersionMetadataURL represents the version service url flag.
	FlagVersionMetadataURL = "version-metadata-url"
	// FlagVersion represents the version flag.
	FlagVersion = "version"
	// FlagSkipWizard represents the flag to skip the installation wizard.
	FlagSkipWizard = "skip-wizard"
	// FlagCatalogNamespace is the name of the catalog namespace flag.
	FlagCatalogNamespace = "catalog-namespace"
	// FlagSkipEnvDetection is the name of the skip env detection flag.
	FlagSkipEnvDetection = "skip-env-detection"
	// FlagSkipOLM is the name of the skip OLM flag.
	FlagSkipOLM = "skip-olm"
	// FlagDisableTelemetry disables telemetry.
	FlagDisableTelemetry = "disable-telemetry"
	// FlagChartDir is the directory where the Helm chart is stored.
	FlagChartDir = "chart-dir"
	// FlagRepository is the URL of the Helm repository.
	FlagRepository = "repository"
	// FlagHelmSet is the name of the helm-set flag.
	FlagHelmSet = "helm-set"
	// FlagHelmValuesFiles is the name of the helm-values flag.
	FlagHelmValuesFiles = "helm-values"

	// everestDBNamespaceSubChartPath is the path to the everest-db-namespace subchart relative to the main chart.
	dbNamespaceSubChartPath = "/charts/everest-db-namespace"

	pollInterval    = 5 * time.Second
	pollTimeout     = 10 * time.Minute
	backoffInterval = 5 * time.Second
)

const postInstallMessage = "Everest has been successfully installed!"

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

const operatorInstallThreads = 1

//nolint:gochecknoglobals
var (
	// ErrNSEmpty appears when the provided list of the namespaces is considered empty.
	ErrNSEmpty = errors.New("namespace list is empty. Specify at least one namespace")
	// ErrNSReserved appears when some of the provided names are forbidden to use.
	ErrNSReserved = func(ns string) error {
		return fmt.Errorf("'%s' namespace is reserved for Everest internals. Please specify another namespace", ns)
	}
	// ErrNameNotRFC1035Compatible appears when some of the provided names are not RFC1035 compatible.
	ErrNameNotRFC1035Compatible = func(fieldName string) error {
		return fmt.Errorf(`'%s' is not RFC 1035 compatible. The name should contain only lowercase alphanumeric characters or '-', start with an alphabetic character, end with an alphanumeric character`,
			fieldName,
		)
	}
	// ErrNoOperatorsSelected appears when no operators are selected for installation.
	ErrNoOperatorsSelected = errors.New("no operators selected for installation. Minimum one operator must be selected")
)

type (
	// Config stores configuration for the operators.
	Config struct {
		// Namespaces is a user-defined string represents raw non-validated comma-separated list of namespaces for everest to operate in.
		Namespaces string `mapstructure:"namespaces"`
		// NamespacesList validated list of namespaces that everest can operate in.
		NamespacesList []string `mapstructure:"namespaces-map"`
		// SkipWizard skips wizard during installation.
		SkipWizard bool `mapstructure:"skip-wizard"`
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
		// Operator installation configuration.
		Operator OperatorConfig
		// If set, we will print the pretty output.
		Pretty bool

		helm.CLIOptions
	}

	// OperatorConfig identifies which operators shall be installed.
	OperatorConfig struct {
		// PG stores if PostgresSQL shall be installed.
		PG bool `mapstructure:"postgresql"`
		// PSMDB stores if MongoDB shall be installed.
		PSMDB bool `mapstructure:"mongodb"`
		// PXC stores if XtraDB Cluster shall be installed.
		PXC bool `mapstructure:"xtradb-cluster"`
	}
)

// NewInstall returns a new Install struct.
func NewInstall(c Config, l *zap.SugaredLogger, cmd *cobra.Command) (*Install, error) {
	cli := &Install{
		config: c,
		cmd:    cmd,
		l:      l.With("component", "install"),
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}

	k, err := kubernetes.New(c.KubeconfigPath, cli.l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	cli.kubeClient = k
	cli.versionService = versionservice.New(c.VersionMetadataURL)
	return cli, nil
}

// Run the Everest installation process.
func (o *Install) Run(ctx context.Context) error {
	// TODO: we shall probably split this into "install" and "add namespaces"
	// Otherwise the logic is hard to maintain - we need to make sure not to,
	// for example, install a different version of operators per namespace, if
	// we are always installing the "latest" version.
	if err := o.populateConfig(); err != nil {
		return err
	}

	if err := o.setKubernetesEnv(ctx); err != nil {
		return fmt.Errorf("failed to detect Kubernetes environment: %w", err)
	}

	if err := o.setVersionInfo(ctx); err != nil {
		return fmt.Errorf("failed to get Everest version info: %w", err)
	}

	if version.IsDev(o.installVersion) && o.config.ChartDir == "" {
		cleanup, err := o.initDevChart()
		if err != nil {
			return err
		}
		defer cleanup()
	}

	if err := o.setupHelmInstaller(ctx); err != nil {
		return err
	}

	installSteps := o.newInstallSteps()

	// Install DB namespaces.
	// TODO: separate command/API for provisioning DB namespaces.
	for _, ns := range o.config.NamespacesList {
		installSteps = append(installSteps, o.provisionDBNamespace(o.installVersion, ns))
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
	return o.printPostInstallMessage(ctx, out)
}

func (o *Install) printPostInstallMessage(ctx context.Context, out io.Writer) error {
	fmt.Fprint(out, "\n", output.Rocket(postInstallMessage))
	// Print message to retrieve admin password
	isAdminSecure, err := o.kubeClient.Accounts().IsSecure(ctx, common.EverestAdminUser)
	if err != nil {
		return errors.Join(err, errors.New("could not check if the admin password is secure"))
	}
	if !isAdminSecure {
		fmt.Fprint(out, "\n", common.InitialPasswordWarningMessage)
	}
	return nil
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
	return nil
}

func (o *Install) setupHelmInstaller(ctx context.Context) error {
	nsExists, err := o.namespaceExists(ctx, common.SystemNamespace)
	if err != nil {
		return err
	}
	values := helmutils.MustMergeValues(
		o.config.Values,
		helm.ClusterValues(o.clusterType),
	)
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

func (o *Install) initDevChart() (func(), error) {
	chartDir, err := helmutils.DevChartDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get dev-latest Helm chart: %w", err)
	}
	o.l.Infof("Downloaded dev-latest Helm chart into '%s'", chartDir)
	o.config.ChartDir = chartDir
	return func() {
		if err := os.RemoveAll(chartDir); err != nil {
			o.l.Warnf("Failed to clean-up dir '%s': %s", chartDir, err)
		}
	}, nil
}

func (o *Install) getDBNamespaceInstallValues() values.Options {
	v := []string{}
	v = append(v, fmt.Sprintf("pxc=%t", o.config.Operator.PXC))
	v = append(v, fmt.Sprintf("postgresql=%t", o.config.Operator.PG))
	v = append(v, fmt.Sprintf("psmdb=%t", o.config.Operator.PSMDB))
	v = append(v, fmt.Sprintf("telemetry=%t", !o.config.DisableTelemetry))
	return values.Options{Values: v}
}

func (o *Install) populateConfig() error {
	if !o.config.SkipWizard {
		if err := o.runWizard(); err != nil {
			return err
		}
	}

	l, err := ValidateNamespaces(o.config.Namespaces)
	if err != nil {
		return err
	}
	o.config.NamespacesList = l

	if !(o.config.Operator.PG || o.config.Operator.PSMDB || o.config.Operator.PXC) {
		return ErrNoOperatorsSelected
	}

	return nil
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

// runWizard runs installation wizard.
func (o *Install) runWizard() error {
	if err := o.runEverestWizard(); err != nil {
		return err
	}

	return o.runInstallWizard()
}

func (o *Install) runEverestWizard() error {
	// if the namespace flag was used, do not run the wizard
	if o.cmd.Flags().Lookup(FlagNamespaces).Changed {
		return nil
	}
	var namespaces string
	pNamespace := &survey.Input{
		Message: "Namespaces managed by Everest [comma separated]",
		Default: o.config.Namespaces,
	}
	if err := survey.AskOne(pNamespace, &namespaces); err != nil {
		return err
	}

	list, err := ValidateNamespaces(namespaces)
	if err != nil {
		return err
	}
	o.config.Namespaces = namespaces
	o.config.NamespacesList = list

	return nil
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

func (o *Install) runInstallWizard() error {
	pgFlag := o.cmd.Flags().Lookup(FlagOperatorPostgresql).Changed
	pxcFlag := o.cmd.Flags().Lookup(FlagOperatorXtraDBCluster).Changed
	psmdbFlag := o.cmd.Flags().Lookup(FlagOperatorMongoDB).Changed

	// if any operator flag was used, do not run the wizard
	if pgFlag || pxcFlag || psmdbFlag {
		return nil
	}

	operatorOpts := []struct {
		label    string
		boolFlag *bool
	}{
		{"MySQL", &o.config.Operator.PXC},
		{"MongoDB", &o.config.Operator.PSMDB},
		{"PostgreSQL", &o.config.Operator.PG},
	}
	operatorLabels := make([]string, 0, len(operatorOpts))
	for _, v := range operatorOpts {
		operatorLabels = append(operatorLabels, v.label)
	}
	operatorDefaults := make([]string, 0, len(operatorOpts))
	for _, v := range operatorOpts {
		if *v.boolFlag {
			operatorDefaults = append(operatorDefaults, v.label)
		}
	}

	pOps := &survey.MultiSelect{
		Message: "What operators do you want to install?",
		Default: operatorDefaults,
		Options: operatorLabels,
	}
	opIndexes := []int{}
	if err := survey.AskOne(
		pOps,
		&opIndexes,
	); err != nil {
		return err
	}

	if len(opIndexes) == 0 {
		return ErrNoOperatorsSelected
	}

	// We reset all flags to false so we select only
	// the ones which the user selected in the multiselect.
	for _, op := range operatorOpts {
		*op.boolFlag = false
	}

	for _, i := range opIndexes {
		o.l.Debugf("Enabling %s operator", operatorOpts[i].label)
		*operatorOpts[i].boolFlag = true
	}

	return nil
}

// createNamespace provisions a namespace for Everest.
func (o *Install) createNamespace(ctx context.Context, namespace string) error {
	o.l.Infof("Creating namespace %s", namespace)
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
			Labels: map[string]string{
				common.KubernetesManagedByLabel: common.Everest,
			},
		},
	}
	err := o.kubeClient.CreateNamespace(ctx, ns)
	if client.IgnoreAlreadyExists(err) != nil {
		return errors.Join(err, errors.New("could not provision namespace"))
	}

	o.l.Infof("Namespace %s has been created", namespace)
	return nil
}

// ValidateNamespaces validates a comma-separated namespaces string.
func ValidateNamespaces(str string) ([]string, error) {
	nsList := strings.Split(str, ",")
	m := make(map[string]struct{})
	for _, ns := range nsList {
		ns = strings.TrimSpace(ns)
		if ns == "" {
			continue
		}

		if ns == common.SystemNamespace || ns == common.MonitoringNamespace || ns == kubernetes.OLMNamespace {
			return nil, ErrNSReserved(ns)
		}

		if err := validateRFC1035(ns); err != nil {
			return nil, err
		}

		m[ns] = struct{}{}
	}

	list := make([]string, 0, len(m))
	for k := range m {
		list = append(list, k)
	}

	if len(list) == 0 {
		return nil, ErrNSEmpty
	}
	return list, nil
}

// validates names to be RFC-1035 compatible  https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#rfc-1035-label-names
func validateRFC1035(s string) error {
	rfc1035Regex := "^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$"
	re := regexp.MustCompile(rfc1035Regex)
	if !re.MatchString(s) {
		return ErrNameNotRFC1035Compatible(s)
	}

	return nil
}

func (o *Install) installDBOperators(ctx context.Context, namespace string) error {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(operatorInstallThreads)

	if o.config.Operator.PXC {
		g.Go(o.installOperator(gCtx, common.PXCOperatorName, namespace))
	}
	if o.config.Operator.PG {
		g.Go(o.installOperator(gCtx, common.PGOperatorName, namespace))
	}
	if o.config.Operator.PSMDB {
		g.Go(o.installOperator(gCtx, common.PSMDBOperatorName, namespace))
	}
	return g.Wait()
}

func (o *Install) installOperator(ctx context.Context, operatorName, namespace string) func() error {
	return func() error {
		// We check if the context has not been cancelled yet to return early
		if err := ctx.Err(); err != nil {
			o.l.Debugf("Cancelled %s operator installation due to context error: %s", operatorName, err)
			return err
		}

		o.l.Infof("Installing %s operator", operatorName)

		params := kubernetes.InstallOperatorRequest{
			Namespace:              namespace,
			Name:                   operatorName,
			CatalogSourceNamespace: kubernetes.OLMNamespace,
		}
		if err := backoff.Retry(func() error {
			return o.kubeClient.InstallOperator(ctx, params)
		}, backoff.NewConstantBackOff(backoffInterval),
		); err != nil {
			o.l.Errorf("failed installing %s operator", operatorName)
			return err
		}

		o.l.Infof("%s operator has been installed", operatorName)
		return nil
	}
}
