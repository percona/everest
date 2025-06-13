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
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

var (
	errFailedToGetUser         = errors.New("failed to get user from context")
	errFailedToReadRequestBody = errors.New("failed to read request body")
)

// CreateDatabaseCluster creates a new db cluster inside the given k8s cluster.
func (e *EverestServer) CreateDatabaseCluster(c echo.Context, cluster, namespace string) error {
	dbc := &everestv1alpha1.DatabaseCluster{}
	if err := e.getBodyFromContext(c, dbc); err != nil {
		return errors.Join(errFailedToReadRequestBody, err)
	}
	dbc.SetNamespace(namespace)

	result, err := e.handler.CreateDatabaseCluster(c.Request().Context(), cluster, dbc)
	if err != nil {
		e.l.Errorf("CreateDatabaseCluster failed: %w", err)
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
func (e *EverestServer) ListDatabaseClusters(ctx echo.Context, cluster, namespace string) error {
	list, err := e.handler.ListDatabaseClusters(ctx.Request().Context(), cluster, namespace)
	if err != nil {
		e.l.Errorf("ListDatabaseClusters failed: %w", err)
		return err
	}
	return ctx.JSON(http.StatusOK, list)
}

// DeleteDatabaseCluster deletes a database cluster on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseCluster(
	c echo.Context,
	cluster, namespace, name string,
	params api.DeleteDatabaseClusterParams,
) error {
	if err := e.handler.DeleteDatabaseCluster(c.Request().Context(), cluster, namespace, name, &params); err != nil {
		e.l.Errorf("DeleteDatabaseCluster failed: %w", err)
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// GetDatabaseCluster retrieves the specified database cluster on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseCluster(c echo.Context, cluster, namespace, name string) error {
	result, err := e.handler.GetDatabaseCluster(c.Request().Context(), cluster, namespace, name)
	if err != nil {
		e.l.Errorf("GetDatabaseCluster failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// GetDatabaseClusterComponents returns database cluster components.
func (e *EverestServer) GetDatabaseClusterComponents(c echo.Context, cluster, namespace, name string) error {
	result, err := e.handler.GetDatabaseClusterComponents(c.Request().Context(), cluster, namespace, name)
	if err != nil {
		e.l.Errorf("GetDatabaseClusterComponents failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// UpdateDatabaseCluster replaces the specified database cluster on the specified kubernetes cluster.
//
//nolint:dupl
func (e *EverestServer) UpdateDatabaseCluster(ctx echo.Context, cluster, namespace, name string) error {
	dbc := &everestv1alpha1.DatabaseCluster{}
	if err := e.getBodyFromContext(ctx, dbc); err != nil {
		return errors.Join(errFailedToReadRequestBody, err)
	}
	dbc.SetNamespace(namespace)
	dbc.SetName(name)

	result, err := e.handler.UpdateDatabaseCluster(ctx.Request().Context(), cluster, dbc)
	if err != nil {
		e.l.Errorf("UpdateDatabaseCluster failed: %w", err)
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// GetDatabaseClusterCredentials returns credentials for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterCredentials(c echo.Context, cluster, namespace, name string) error {
	result, err := e.handler.GetDatabaseClusterCredentials(c.Request().Context(), cluster, namespace, name)
	if err != nil {
		e.l.Errorf("GetDatabaseClusterCredentials failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, result)
}

// GetDatabaseClusterPitr returns the point-in-time recovery related information for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterPitr(c echo.Context, cluster, namespace, name string) error {
	result, err := e.handler.GetDatabaseClusterPitr(c.Request().Context(), cluster, namespace, name)
	if err != nil {
		e.l.Errorf("GetDatabaseClusterPitr failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, result)
}
