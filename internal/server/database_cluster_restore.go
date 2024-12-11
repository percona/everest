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

// Package server contains the API server implementation.
package server

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

// ListDatabaseClusterRestores List of the created database cluster restores on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusterRestores(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.ListDatabaseClusterRestores(ctx.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// CreateDatabaseClusterRestore Create a database cluster restore on the specified kubernetes cluster.
func (e *EverestServer) CreateDatabaseClusterRestore(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context: " + err.Error()),
		})
	}

	restore := &everestv1alpha1.DatabaseClusterRestore{}
	if err := e.getBodyFromContext(ctx, restore); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseClusterRestore from the request body"),
		})
	}
	restore.SetNamespace(namespace)

	result, err := e.handler.CreateDatabaseClusterRestore(ctx.Request().Context(), user, restore)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusCreated, result)
}

// DeleteDatabaseClusterRestore Delete the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	if err := e.handler.DeleteDatabaseClusterRestore(ctx.Request().Context(), user, namespace, name); err != nil {
		return err
	}
	return ctx.NoContent(http.StatusNoContent)
}

// GetDatabaseClusterRestore Returns the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	rs, err := e.handler.GetDatabaseClusterRestore(ctx.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, rs)
}

// UpdateDatabaseClusterRestore Replace the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) UpdateDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	restore := &everestv1alpha1.DatabaseClusterRestore{}
	if err := e.getBodyFromContext(ctx, restore); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseClusterRestore from the request body"),
		})
	}
	restore.SetNamespace(namespace)
	restore.SetName(name)

	result, err := e.handler.UpdateDatabaseClusterRestore(ctx.Request().Context(), user, restore)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}
