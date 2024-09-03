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

// Package upgrade implements upgrade logic for the CLI.
package upgrade

import (
	"context"
	"fmt"
	"time"

	"github.com/cenkalti/backoff/v4"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/common"
)

const (
	backupStorageCleanupFinalizer = "percona.com/cleanup-secrets"
)

//nolint:mnd
func (u *Upgrade) migrateSharedResources(ctx context.Context) error {
	var b backoff.BackOff
	b = backoff.NewConstantBackOff(5 * time.Second)
	b = backoff.WithMaxRetries(b, 5)
	b = backoff.WithContext(b, ctx)

	// Migrate backup storages.
	if err := backoff.Retry(func() error {
		return u.migrateBackupStorages(ctx)
	}, b,
	); err != nil {
		return err
	}
	// Migrate monitoring configs.
	if err := backoff.Retry(func() error {
		return u.migrateMonitoringInstaces(ctx)
	}, b,
	); err != nil {
		return err
	}
	return nil
}

// copySecret copies the given secret to the given namespace.
// preserves only the spec. No error if already exists.
func (u *Upgrade) copySecret(ctx context.Context, secret *corev1.Secret, namespace string) error {
	clone := secret.DeepCopy()
	clone.ObjectMeta = metav1.ObjectMeta{
		Name:      secret.GetName(),
		Namespace: namespace,
	}
	if _, err := u.kubeClient.CreateSecret(ctx, clone); client.IgnoreAlreadyExists(err) != nil {
		return err
	}
	return nil
}

func (u *Upgrade) migrateBackupStorages(ctx context.Context) error {
	backupStorages, err := u.kubeClient.ListBackupStorages(ctx, common.SystemNamespace)
	if err != nil {
		return err
	}
	for _, bs := range backupStorages.Items {
		for _, ns := range bs.Spec.AllowedNamespaces { //nolint:nolintlint,staticcheck
			// Check if the namespace exists?
			if _, err := u.kubeClient.GetNamespace(ctx, ns); err != nil && k8serrors.IsNotFound(err) {
				continue
			} else if err != nil {
				return err
			}
			// Create the credential Secret.
			secret, err := u.kubeClient.GetSecret(ctx, common.SystemNamespace, bs.Spec.CredentialsSecretName)
			if err != nil {
				return fmt.Errorf("cannot find credentials secret %s for backup storage %s",
					bs.Spec.CredentialsSecretName, bs.Name,
				)
			}
			if err := u.copySecret(ctx, secret, ns); err != nil {
				return fmt.Errorf("cannot copy credentials secret %s in namespace %s", secret.Name, ns)
			}
			// Create the BackupStorage.
			bsClone := bs.DeepCopy()
			bsClone.ObjectMeta = metav1.ObjectMeta{
				Name:      bs.GetName(),
				Namespace: ns,
			}
			bsClone.Spec.AllowedNamespaces = nil //nolint:nolintlint,staticcheck
			if err := u.kubeClient.CreateBackupStorage(ctx, bsClone); client.IgnoreAlreadyExists(err) != nil {
				return fmt.Errorf("cannot create backup storage %s in namespace %s", bsClone.GetName(), ns)
			}

		}
		// Remove the Secret clean-up finalizer from the original BackupStorage.
		// The purpose of this finalizer is to remove all Secrets linked to this BS, in the DB namespaces.
		// After this migration, these Secrets are owned by the newly created BackupStorage in the target namespace.
		finalizers := make([]string, 0, len(bs.GetFinalizers()))
		for _, f := range bs.GetFinalizers() {
			if f == backupStorageCleanupFinalizer {
				continue
			}
			finalizers = append(finalizers, f)
		}
		bs.SetFinalizers(finalizers)
		if err := u.kubeClient.UpdateBackupStorage(ctx, &bs); err != nil {
			return fmt.Errorf("cannot remove finalizer %s from backup storage %s", backupStorageCleanupFinalizer, bs.Name)
		}
	}
	return nil
}

func (u *Upgrade) migrateMonitoringInstaces(ctx context.Context) error {
	monitoringConfigs, err := u.kubeClient.ListMonitoringConfigs(ctx, common.MonitoringNamespace)
	if err != nil {
		return err
	}
	for _, mc := range monitoringConfigs.Items {
		for _, ns := range mc.Spec.AllowedNamespaces {
			// Check if the namespace exists?
			if _, err := u.kubeClient.GetNamespace(ctx, ns); err != nil && k8serrors.IsNotFound(err) {
				continue
			} else if err != nil {
				return err
			}
			// Create the credential Secret.
			secret, err := u.kubeClient.GetSecret(ctx, common.MonitoringNamespace, mc.Spec.CredentialsSecretName)
			if err != nil {
				return fmt.Errorf("cannot find credentials secret %s for monitoring config %s", mc.Spec.CredentialsSecretName, mc.Name)
			}
			if err := u.copySecret(ctx, secret, ns); err != nil {
				return fmt.Errorf("cannot copy credentials secret %s in namespace %s", secret.Name, ns)
			}
			// Create the MonitoringConfig.
			mcClone := mc.DeepCopy()
			mcClone.ObjectMeta = metav1.ObjectMeta{
				Name:      mc.GetName(),
				Namespace: ns,
			}
			mcClone.Spec.AllowedNamespaces = nil
			if err := u.kubeClient.CreateMonitoringConfig(ctx, mcClone); client.IgnoreAlreadyExists(err) != nil {
				return fmt.Errorf("cannot create monitoring config %s in namespace %s", mcClone.GetName(), ns)
			}
		}
	}
	return nil
}
