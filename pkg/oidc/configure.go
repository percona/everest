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

// Package oidc ...
package oidc

import (
	"context"
	"errors"

	"github.com/AlecAivazis/survey/v2"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

// OIDC describes the command to configure OIDC settings.
type OIDC struct {
	config     Config
	kubeClient *kubernetes.Kubernetes
	l          *zap.SugaredLogger
}

// Config stores configuration for the OIDC command.
type Config struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string `mapstructure:"kubeconfig"`
	// IssuerURL OIDC issuer url.
	IssuerURL string `mapstructure:"issuer-url"`
	// ClientID ID of the client OIDC app.
	ClientID string `mapstructure:"client-id"`
}

// NewOIDC returns a new OIDC struct.
func NewOIDC(c Config, l *zap.SugaredLogger) (*OIDC, error) {
	kubeClient, err := kubernetes.New(c.KubeconfigPath, l)
	if err != nil {
		return nil, err
	}

	cli := &OIDC{
		config:     c,
		kubeClient: kubeClient,
		l:          l,
	}
	return cli, nil
}

// Run runs the command.
func (u *OIDC) Run(ctx context.Context) error {
	issuerURL := u.config.IssuerURL
	clientID := u.config.ClientID

	if issuerURL == "" {
		if err := survey.AskOne(&survey.Input{
			Message: "Enter issuer URL",
		}, &issuerURL,
		); err != nil {
			return err
		}
	}
	if clientID == "" {
		if err := survey.AskOne(&survey.Input{
			Message: "Enter client ID",
		}, &clientID,
		); err != nil {
			return err
		}
	}

	if clientID == "" || issuerURL == "" {
		return errors.New("clientID and/or issuerURL are not provided")
	}

	// Check if we can connect to the provider.
	_, err := getProviderConfig(ctx, issuerURL)
	if err != nil {
		return errors.Join(err, errors.New("failed to connect with OIDC provider"))
	}

	oidcCfg := common.OIDCConfig{
		IssuerURL: issuerURL,
		ClientID:  clientID,
	}

	oidcRaw, err := oidcCfg.Raw()
	if err != nil {
		return err
	}

	if err := u.kubeClient.UpdateEverestSettings(ctx, common.EverestSettings{
		OIDCConfigRaw: oidcRaw,
	}); err != nil {
		return err
	}

	u.l.Info("OIDC provider configured, restarting Everest..")

	err = u.kubeClient.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
	if err != nil {
		return err
	}

	u.l.Info("OIDC has been configured successfully")
	return nil
}
