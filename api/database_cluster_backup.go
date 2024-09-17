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

// Package api ...
package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/cenkalti/backoff/v4"
	"github.com/labstack/echo/v4"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/rbac"
)

const (
	databaseClusterBackupKind = "databaseclusterbackups"
	databaseClusterNameLabel  = "clusterName"
	maxRetries                = 10
)

//nolint:gochecknoglobals
var everestAPIConstantBackoff = backoff.WithMaxRetries(backoff.NewConstantBackOff(time.Second), maxRetries)

// ListDatabaseClusterBackups returns list of the created database cluster backups on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusterBackups(ctx echo.Context, namespace, name string) error {
	req := ctx.Request()
	if err := validateRFC1035(name, "name"); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	val := url.Values{}
	val.Add("labelSelector", fmt.Sprintf("clusterName=%s", name))
	req.URL.RawQuery = val.Encode()
	path := req.URL.Path
	// trim backups
	path = strings.TrimSuffix(path, "/backups")
	// trim name
	path = strings.TrimSuffix(path, name)
	path = strings.ReplaceAll(path, "database-clusters", "database-cluster-backups")
	req.URL.Path = path

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	rbacFilter := transformK8sList(func(l *unstructured.UnstructuredList) error {
		allowed := []unstructured.Unstructured{}
		for _, obj := range l.Items {
			dbbackup := &everestv1alpha1.DatabaseClusterBackup{}
			if err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, dbbackup); err != nil {
				e.l.Error(errors.Join(err, errors.New("failed to convert unstructured to DatabaseClusterBackup")))
				return err
			}
			if can, err := e.canGetBackupStorage(user, namespace, obj.GetName()); err != nil {
				e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
				return err
			} else if !can {
				continue
			}
			allowed = append(allowed, obj)
		}
		l.Items = allowed
		return nil
	})
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, "", rbacFilter)
}

// CreateDatabaseClusterBackup creates a database cluster backup on the specified kubernetes cluster.
func (e *EverestServer) CreateDatabaseClusterBackup(ctx echo.Context, namespace string) error {
	dbb := &DatabaseClusterBackup{}
	if err := e.getBodyFromContext(ctx, dbb); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseClusterBackup from the request body"),
		})
	}
	// TODO: Improve returns status code in EVEREST-616
	if err := e.validateDatabaseClusterBackup(ctx.Request().Context(), namespace, dbb); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}

	// Do not allow a new backup to be created if there's another backup running already.
	if ok, err := e.ensureNoBackupsRunningForCluster(ctx.Request().Context(), dbb.Spec.DbClusterName, namespace); err != nil {
		return err
	} else if !ok {
		return ctx.JSON(http.StatusPreconditionFailed,
			Error{Message: pointer.ToString("Cannot create a new backup when another backup is already running")},
		)
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, "")
}

// Returns `true` if no backups are running for the specified cluster.
func (e *EverestServer) ensureNoBackupsRunningForCluster(ctx context.Context, dbClusterName, namespace string) (bool, error) {
	backupList, err := e.kubeClient.ListDatabaseClusterBackups(ctx, namespace, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				databaseClusterNameLabel: dbClusterName,
			},
		}),
	})
	if err != nil {
		return false, errors.Join(err, errors.New("could not list Database Cluster Backups"))
	}
	return !slices.ContainsFunc(backupList.Items, func(b everestv1alpha1.DatabaseClusterBackup) bool {
		return (b.Status.State == everestv1alpha1.BackupRunning ||
			b.Status.State == everestv1alpha1.BackupStarting ||
			b.Status.State == everestv1alpha1.BackupNew) &&
			b.DeletionTimestamp.IsZero()
	}), nil
}

// DeleteDatabaseClusterBackup deletes the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseClusterBackup(
	ctx echo.Context,
	namespace, name string,
	params DeleteDatabaseClusterBackupParams,
) error {
	cleanupStorage := pointer.Get(params.CleanupBackupStorage)

	reqCtx := ctx.Request().Context()
	backup, err := e.kubeClient.GetDatabaseClusterBackup(reqCtx, namespace, name)
	if err != nil {
		return errors.Join(err, errors.New("could not get Database Cluster"))
	}

	if !cleanupStorage {
		if err := e.ensureBackupStorageProtection(reqCtx, backup); err != nil {
			return errors.Join(err, errors.New("could not ensure backup storage protection"))
		}
	}

	if err := e.ensureBackupForegroundDeletion(ctx.Request().Context(), backup); err != nil {
		return errors.Join(err, errors.New("could not ensure backup foreground deletion"))
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, name)
}

// GetDatabaseClusterBackup returns the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseClusterBackup(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	bkp, err := e.kubeClient.GetDatabaseClusterBackup(ctx.Request().Context(), namespace, name)
	if err != nil {
		return errors.Join(err, errors.New("could not get Database Cluster Backup"))
	}
	if can, err := e.canGetBackupStorage(user, namespace, bkp.Spec.BackupStorageName); err != nil {
		e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
		return err
	} else if !can {
		return ctx.JSON(http.StatusForbidden, Error{
			Message: pointer.ToString(errInsufficientPermissions.Error()),
		})
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, name)
}

func (e *EverestServer) ensureBackupStorageProtection(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) error {
	// We wrap this logic in a retry loop to reduce the chances of resource conflicts.
	return backoff.Retry(func() error {
		backup, err := e.kubeClient.GetDatabaseClusterBackup(ctx, backup.GetNamespace(), backup.GetName())
		if err != nil {
			return err
		}
		controllerutil.AddFinalizer(backup, everestv1alpha1.DBBackupStorageProtectionFinalizer)
		controllerutil.AddFinalizer(backup, common.ForegroundDeletionFinalizer)
		_, err = e.kubeClient.UpdateDatabaseClusterBackup(ctx, backup)
		return err
	},
		backoff.WithContext(everestAPIConstantBackoff, ctx),
	)
}

func (e *EverestServer) ensureBackupForegroundDeletion(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) error {
	// We wrap this logic in a retry loop to reduce the chances of resource conflicts.
	return backoff.Retry(func() error {
		backup, err := e.kubeClient.GetDatabaseClusterBackup(ctx, backup.GetNamespace(), backup.GetName())
		if err != nil {
			return err
		}
		controllerutil.AddFinalizer(backup, common.ForegroundDeletionFinalizer)
		_, err = e.kubeClient.UpdateDatabaseClusterBackup(ctx, backup)
		return err
	},
		backoff.WithContext(everestAPIConstantBackoff, ctx),
	)
}

func (e *EverestServer) canGetBackupStorage(user, namespace, name string) (bool, error) {
	ok, err := e.rbacEnforcer.Enforce(
		user, rbac.ResourceBackupStorages,
		rbac.ActionRead,
		fmt.Sprintf("%s/%s", namespace, name),
	)
	if err != nil {
		return false, fmt.Errorf("failed to Enforce: %w", err)
	}
	return ok, nil
}
