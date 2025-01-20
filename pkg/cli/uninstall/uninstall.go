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

// Package uninstall ...
package uninstall

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/AlecAivazis/survey/v2"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli/namespaces"
	"github.com/percona/everest/pkg/cli/steps"
	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	pollInterval = 5 * time.Second
	pollTimeout  = 5 * time.Minute
)

// Uninstall implements logic for the cluster command.
type Uninstall struct {
	config      Config
	kubeClient  *kubernetes.Kubernetes
	l           *zap.SugaredLogger
	clusterType kubernetes.ClusterType
}

// Config stores configuration for the Uninstall command.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string
	// AssumeYes is true when all questions can be skipped.
	AssumeYes bool
	// Force is true when we shall not prompt for removal.
	Force bool
	// SkipEnvDetection skips detecting the Kubernetes environment.
	SkipEnvDetection bool
	// If set, we will print the pretty output.
	Pretty bool
}

// NewUninstall returns a new Uninstall struct.
func NewUninstall(c Config, l *zap.SugaredLogger) (*Uninstall, error) {
	cli := &Uninstall{
		config: c,
		l:      l,
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}

	kubeClient, err := cliutils.NewKubeclient(cli.l, c.KubeconfigPath)
	if err != nil {
		return nil, err
	}
	cli.kubeClient = kubeClient
	return cli, nil
}

// Run runs the cluster command.
func (u *Uninstall) Run(ctx context.Context) error {
	// This command expects a Helm based installation. Otherwise, we stop here.
	// Older versions must use an older version of the CLI.
	_, err := cliutils.CheckHelmInstallation(ctx, u.kubeClient)
	if err != nil {
		return err
	}

	if abort, err := u.runWizard(); err != nil {
		return err
	} else if abort {
		u.l.Info("Exiting")
		return nil
	}

	if err := u.setKubernetesEnv(ctx); err != nil {
		return fmt.Errorf("failed to detect Kubernetes environment: %w", err)
	}

	dbsExist, err := u.kubeClient.DatabasesExist(ctx)
	if err != nil {
		return errors.Join(err, errors.New("failed to check if databases exist"))
	}
	if dbsExist {
		force, err := u.confirmForce()
		if err != nil {
			return err
		}

		if !force {
			u.l.Info("Can't proceed without deleting database clusters")
			return nil
		}
	}

	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return fmt.Errorf("failed to get database namespaces: %w", err)
	}

	uninstallSteps := u.newUninstallSteps(dbNamespaces)

	var out io.Writer = os.Stdout
	if !u.config.Pretty {
		out = io.Discard
	}

	if err := steps.RunStepsWithSpinner(ctx, uninstallSteps, out); err != nil {
		return err
	}

	u.l.Infof("Everest has been uninstalled successfully")
	fmt.Fprintln(out, "Everest has been uninstalled successfully")
	return nil
}

func (u *Uninstall) setKubernetesEnv(ctx context.Context) error {
	if !u.config.SkipEnvDetection {
		return nil
	}
	t, err := u.kubeClient.GetClusterType(ctx)
	if err != nil {
		return err
	}
	u.clusterType = t
	u.l.Infof("Detected Kubernetes environment: %s", t)
	return nil
}

func (u *Uninstall) newUninstallSteps(dbNamespaces []string) []steps.Step {
	steps := []steps.Step{}

	for _, ns := range dbNamespaces {
		steps = append(steps, namespaces.NewRemoveNamespaceSteps(ns, false, u.kubeClient)...)
	}
	steps = append(steps, u.newStepUninstallHelmChart())
	steps = append(steps, u.newStepDeleteNamespace(common.MonitoringNamespace))
	steps = append(steps, u.newStepDeleteNamespace(common.SystemNamespace))
	steps = append(steps, u.newStepDeleteCRDs())
	return steps
}

// Run the uninstall wizard.
// Returns true if uninstall is aborted.
func (u *Uninstall) runWizard() (bool, error) {
	if !u.config.AssumeYes {
		msg := `You are about to uninstall Everest from the Kubernetes cluster.
This will uninstall Everest and all its components from the cluster.`
		fmt.Printf("\n%s\n\n", msg) //nolint:forbidigo
		confirm := &survey.Confirm{
			Message: "Are you sure you want to uninstall Everest?",
		}
		prompt := false
		if err := survey.AskOne(confirm, &prompt); err != nil {
			return false, err
		}

		if !prompt {
			return true, nil
		}
	}

	return false, nil
}

func (u *Uninstall) confirmForce() (bool, error) {
	if u.config.Force {
		return true, nil
	}

	confirm := &survey.Confirm{
		Message: "There are still database clusters managed by Everest. Do you want to delete them?",
	}
	prompt := false
	if err := survey.AskOne(confirm, &prompt); err != nil {
		return false, err
	}

	return prompt, nil
}
