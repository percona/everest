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

// Package client ...
package client

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateMonitoringConfig creates an monitoringConfig.
func (c *Client) CreateMonitoringConfig(ctx context.Context, config *everestv1alpha1.MonitoringConfig) error {
	_, err := c.customClientSet.MonitoringConfig(config.Namespace).Create(ctx, config, metav1.CreateOptions{})
	return err
}

// UpdateMonitoringConfig updates an monitoringConfig.
func (c *Client) UpdateMonitoringConfig(ctx context.Context, config *everestv1alpha1.MonitoringConfig) error {
	_, err := c.customClientSet.MonitoringConfig(config.Namespace).Update(ctx, config, metav1.UpdateOptions{})
	return err
}

// GetMonitoringConfig returns the monitoringConfig.
func (c *Client) GetMonitoringConfig(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return c.customClientSet.MonitoringConfig(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListMonitoringConfigs returns the monitoringConfig.
func (c *Client) ListMonitoringConfigs(ctx context.Context, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return c.customClientSet.MonitoringConfig(namespace).List(ctx, metav1.ListOptions{})
}

// DeleteMonitoringConfig deletes the monitoringConfig.
func (c *Client) DeleteMonitoringConfig(ctx context.Context, namespace, name string) error {
	return c.customClientSet.MonitoringConfig(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
