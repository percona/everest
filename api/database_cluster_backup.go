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
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	databaseClusterBackupKind = "databaseclusterbackups"

	storageCleanupFinalizer     = "everest.percona.com/dbb-storage-cleanup"
	foregroundDeletionFinalizer = "foregroundDeletion"
)

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
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, "")
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
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, "")
}

// DeleteDatabaseClusterBackup deletes the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseClusterBackup(
	ctx echo.Context,
	namespace, name string,
	params DeleteDatabaseClusterBackupParams,
) error {
	cleanupStorage := pointer.Get(params.CleanupBackupStorage)
	// If cleanup is required, we add a finalizer to the backup object.
	if cleanupStorage {
		reqCtx := ctx.Request().Context()
		backup, err := e.kubeClient.GetDatabaseClusterBackup(reqCtx, namespace, name)
		if err != nil {
			return errors.Join(err, errors.New("could not get Database Cluster"))
		}
		if err := e.cleanupBackupStorage(reqCtx, backup); err != nil {
			return errors.Join(err, errors.New("could not cleanup backup storage"))
		}
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, name)
}

// GetDatabaseClusterBackup returns the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseClusterBackup(ctx echo.Context, namespace, name string) error {
	return e.proxyKubernetes(ctx, namespace, databaseClusterBackupKind, name)
}

func (e *EverestServer) cleanupBackupStorage(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) error {
	controllerutil.AddFinalizer(backup, storageCleanupFinalizer)
	controllerutil.AddFinalizer(backup, foregroundDeletionFinalizer)
	_, err := e.kubeClient.UpdateDatabaseClusterBackup(ctx, backup)
	return err
}
