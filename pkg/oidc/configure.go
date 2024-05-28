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
	err := u.kubeClient.UpdateEverestSettings(ctx, common.EverestSettings{
		OIDC: common.OIDCConfig{
			IssuerURL: u.config.IssuerURL,
			ClientID:  u.config.ClientID,
		},
	})
	if err != nil {
		return err
	}

	err = u.kubeClient.RestartDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
	if err != nil {
		return err
	}

	u.l.Info("OIDC has been configured successfully")
	return nil
}
