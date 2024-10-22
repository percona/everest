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

	"github.com/AlecAivazis/survey/v2"
	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

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
)

const postInstallMessage = "Everest has been successfully installed!"

// Install implements the main logic for commands.
type Install struct {
	l *zap.SugaredLogger

	config         Config
	cmd            *cobra.Command
	kubeClient     *kubernetes.Kubernetes
	versionService versionservice.Interface
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

		SkipEnvDetection bool   `mapstructure:"skip-env-detection"`
		SkipOLM          bool   `mapstructure:"skip-olm"`
		CatalogNamespace string `mapstructure:"catalog-namespace"`

		Operator OperatorConfig

		// If set, we will print the pretty output.
		Pretty bool
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

// Run runs the operators installation process.
func (o *Install) Run(ctx context.Context) error { //nolint:funlen
	// TODO: we shall probably split this into "install" and "add namespaces"
	// Otherwise the logic is hard to maintain - we need to make sure not to,
	// for example, install a different version of operators per namespace, if
	// we are always installing the "latest" version.
	if err := o.populateConfig(); err != nil {
		return err
	}

	var err error
	installSteps := []common.Step{}

	meta, err := o.versionService.GetEverestMetadata(ctx)
	if err != nil {
		return errors.Join(err, errors.New("could not fetch version metadata"))
	}
	latest, latestMeta, err := o.latestVersion(meta)
	if err != nil {
		return err
	}

	if err = o.checkRequirements(latestMeta); err != nil {
		return err
	}

	recVer, err := version.RecommendedVersions(latestMeta)
	if err != nil {
		return err
	}
	if recVer.EverestOperator == nil {
		// If there's no recommended version of the operator, install the same version as Everest.
		recVer.EverestOperator = latest
	}

	o.l.Debugf("Everest latest version available: %s", latest)
	o.l.Debugf("Everest version information %#v", latestMeta)

	var out io.Writer = os.Stdout
	if !o.config.Pretty {
		out = io.Discard
	}
	fmt.Fprintln(out, output.Info("Installing Everest version %s", latest))
	if err := common.RunStepsWithSpinner(ctx, installSteps, out); err != nil {
		return err
	}
	fmt.Fprint(os.Stdout, "\n", output.Rocket(postInstallMessage))

	isAdminSecure, err := o.kubeClient.Accounts().IsSecure(ctx, common.EverestAdminUser)
	if err != nil {
		return errors.Join(err, errors.New("could not check if the admin password is secure"))
	}
	if !isAdminSecure {
		fmt.Fprint(os.Stdout, "\n", common.InitialPasswordWarningMessage)
	}
	return nil
}

func (o *Install) checkRequirements(meta *versionpb.MetadataVersion) error {
	supVer, err := common.NewSupportedVersion(meta)
	if err != nil {
		return err
	}

	if err := common.CheckK8sRequirements(supVer, o.l, o.kubeClient); err != nil {
		return err
	}

	return nil
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

	if !o.config.SkipEnvDetection {
		if o.config.CatalogNamespace != kubernetes.OLMNamespace || o.config.SkipOLM {
			// Catalog namespace or Skip OLM implies disabled environment detection.
			o.config.SkipEnvDetection = true
		}
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

func (o *Install) operatorNamesListShortHand() string {
	operators := []string{}
	if o.config.Operator.PXC {
		operators = append(operators, "pxc")
	}
	if o.config.Operator.PSMDB {
		operators = append(operators, "psmdb")
	}
	if o.config.Operator.PG {
		operators = append(operators, "pg")
	}
	return strings.Join(operators, ", ")
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
