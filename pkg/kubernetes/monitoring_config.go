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

// Package kubernetes ...
package kubernetes

import (
	"context"

	"k8s.io/apimachinery/pkg/util/wait"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	monitoringConfigNameLabel = "monitoringConfigName"
)

// ListMonitoringConfigs returns list of managed monitoring configs.
func (k *Kubernetes) ListMonitoringConfigs(ctx context.Context, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return k.client.ListMonitoringConfigs(ctx, namespace)
}

// GetMonitoringConfig returns monitoring configs by provided name.
func (k *Kubernetes) GetMonitoringConfig(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return k.client.GetMonitoringConfig(ctx, namespace, name)
}

// CreateMonitoringConfig returns monitoring configs by provided name.
func (k *Kubernetes) CreateMonitoringConfig(ctx context.Context, storage *everestv1alpha1.MonitoringConfig) (*everestv1alpha1.MonitoringConfig, error) {
	return k.client.CreateMonitoringConfig(ctx, storage)
}

// UpdateMonitoringConfig returns monitoring configs by provided name.
func (k *Kubernetes) UpdateMonitoringConfig(ctx context.Context, storage *everestv1alpha1.MonitoringConfig) (*everestv1alpha1.MonitoringConfig, error) {
	return k.client.UpdateMonitoringConfig(ctx, storage)
}

// DeleteMonitoringConfig returns monitoring configs by provided name.
func (k *Kubernetes) DeleteMonitoringConfig(ctx context.Context, namespace, name string) error {
	return k.client.DeleteMonitoringConfig(ctx, namespace, name)
}

// DeleteMonitoringConfigs deletes all monitoring configs in provided namespace.
// This function will wait until all configs are deleted.
func (k *Kubernetes) DeleteMonitoringConfigs(ctx context.Context, namespace string) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		list, err := k.ListMonitoringConfigs(ctx, namespace)
		if err != nil {
			return false, err
		}
		if len(list.Items) == 0 {
			return true, nil
		}
		for _, storage := range list.Items {
			if err := k.DeleteMonitoringConfig(ctx, storage.GetNamespace(), storage.GetName()); ctrlclient.IgnoreNotFound(err) != nil {
				return false, err
			}
		}
		return false, nil
	})
}

// IsMonitoringConfigUsed checks if a monitoring config is used by any database cluster in the provided namespace.
func (k *Kubernetes) IsMonitoringConfigUsed(ctx context.Context, namespace, name string) (bool, error) {
	_, err := k.client.GetMonitoringConfig(ctx, namespace, name)
	if err != nil {
		return false, err
	}

	options := &ctrlclient.ListOptions{Namespace: namespace}
	ctrlclient.MatchingLabels{monitoringConfigNameLabel: name}.ApplyToList(options)

	clusters := &everestv1alpha1.DatabaseClusterList{}
	err = k.k8sClient.List(ctx, clusters, options)
	if err != nil {
		return false, err
	}
	if len(clusters.Items) > 0 {
		return true, nil
	}

	return false, nil
}

// GetMonitoringConfigsBySecretName returns a list of monitoring configs which use
// the provided secret name.
func (k *Kubernetes) GetMonitoringConfigsBySecretName(
	ctx context.Context, namespace, secretName string,
) ([]*everestv1alpha1.MonitoringConfig, error) {
	mcs, err := k.client.ListMonitoringConfigs(ctx, namespace)
	if err != nil {
		return nil, err
	}

	res := make([]*everestv1alpha1.MonitoringConfig, 0, 1)
	for _, mc := range mcs.Items {
		if mc.Spec.CredentialsSecretName == secretName {
			//nolint:exportloopref
			res = append(res, &mc)
		}
	}

	return res, nil
}
