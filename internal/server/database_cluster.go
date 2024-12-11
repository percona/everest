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
	"context"
	"net/http"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

// CreateDatabaseCluster creates a new db cluster inside the given k8s cluster.
func (e *EverestServer) CreateDatabaseCluster(c echo.Context, namespace string) error {
	dbc := &everestv1alpha1.DatabaseCluster{}
	if err := e.getBodyFromContext(c, dbc); err != nil {
		e.l.Error(err)
		return c.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseCluster from the request body"),
		})
	}
	dbc.SetNamespace(namespace)

	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.CreateDatabaseCluster(c.Request().Context(), user, dbc)
	if err != nil {
		return err
	}
	// Collect metrics immediately after a DB cluster has been created.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()

		if err := e.collectMetrics(ctx, *e.config); err != nil {
			e.l.Errorf("Could not send metrics: %s", err)
		}
	}()
	return c.JSON(http.StatusCreated, result)
}

// ListDatabaseClusters lists the created database clusters on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusters(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	list, err := e.handler.ListDatabaseClusters(ctx.Request().Context(), user, namespace)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, list)
}

// DeleteDatabaseCluster deletes a database cluster on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseCluster(
	c echo.Context,
	namespace, name string,
	params api.DeleteDatabaseClusterParams,
) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	if err := e.handler.DeleteDatabaseCluster(c.Request().Context(), user, namespace, name, &params); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// GetDatabaseCluster retrieves the specified database cluster on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseCluster(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	result, err := e.handler.GetDatabaseCluster(c.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// GetDatabaseClusterComponents returns database cluster components.
func (e *EverestServer) GetDatabaseClusterComponents(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	result, err := e.handler.GetDatabaseClusterComponents(c.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// UpdateDatabaseCluster replaces the specified database cluster on the specified kubernetes cluster.
//
//nolint:dupl
func (e *EverestServer) UpdateDatabaseCluster(ctx echo.Context, namespace, name string) error {
	dbc := &everestv1alpha1.DatabaseCluster{}
	if err := e.getBodyFromContext(ctx, dbc); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseCluster from the request body"),
		})
	}
	dbc.SetNamespace(namespace)
	dbc.SetName(name)

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.UpdateDatabaseCluster(ctx.Request().Context(), user, dbc)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// GetDatabaseClusterCredentials returns credentials for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterCredentials(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	result, err := e.handler.GetDatabaseClusterCredentials(c.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// GetDatabaseClusterPitr returns the point-in-time recovery related information for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterPitr(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	result, err := e.handler.GetDatabaseClusterPitr(c.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}
