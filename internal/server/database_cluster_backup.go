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
package server

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

// ListDatabaseClusterBackups returns list of the created database cluster backups on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusterBackups(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.ListDatabaseClusterBackups(c.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// CreateDatabaseClusterBackup creates a database cluster backup on the specified kubernetes cluster.
func (e *EverestServer) CreateDatabaseClusterBackup(ctx echo.Context, namespace string) error {
	dbb := &everestv1alpha1.DatabaseClusterBackup{}
	if err := e.getBodyFromContext(ctx, dbb); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseClusterBackup from the request body"),
		})
	}
	dbb.SetNamespace(namespace)

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.CreateDatabaseClusterBackup(ctx.Request().Context(), user, dbb)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// DeleteDatabaseClusterBackup deletes the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseClusterBackup(
	ctx echo.Context,
	namespace, name string,
	params api.DeleteDatabaseClusterBackupParams,
) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	if err := e.handler.DeleteDatabaseClusterBackup(ctx.Request().Context(), user, namespace, name, &params); err != nil {
		return err
	}
	return ctx.NoContent(http.StatusNoContent)
}

// GetDatabaseClusterBackup returns the specified cluster backup on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseClusterBackup(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.GetDatabaseClusterBackup(ctx.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}
