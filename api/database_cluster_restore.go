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
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

const (
	databaseClusterRestoreKind = "databaseclusterrestores"
)

// ListDatabaseClusterRestores List of the created database cluster restores on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusterRestores(ctx echo.Context, namespace, name string) error {
	req := ctx.Request()
	if err := validateRFC1035(name, "name"); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	val := url.Values{}
	val.Add("labelSelector", fmt.Sprintf("clusterName=%s", name))
	req.URL.RawQuery = val.Encode()
	path := req.URL.Path
	// trim restores
	path = strings.TrimSuffix(path, "/restores")
	// trim name
	path = strings.TrimSuffix(path, name)
	path = strings.ReplaceAll(path, "database-clusters", "database-cluster-restores")
	req.URL.Path = path
	return e.proxyKubernetes(ctx, namespace, databaseClusterRestoreKind, "")
}

// CreateDatabaseClusterRestore Create a database cluster restore on the specified kubernetes cluster.
func (e *EverestServer) CreateDatabaseClusterRestore(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context: " + err.Error()),
		})
	}

	restore := &DatabaseClusterRestore{}
	if err := e.getBodyFromContext(ctx, restore); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseClusterRestore from the request body"),
		})
	}

	dbCluster, err := e.kubeClient.GetDatabaseCluster(ctx.Request().Context(), namespace, restore.Spec.DbClusterName)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString(err.Error()),
		})
	}

	if ok, err := e.canGetDatabaseClusterCredentials(user, dbCluster.GetNamespace()+"/"+dbCluster.GetName()); err != nil {
		e.l.Error(errors.Join(err, errors.New("failed to check database-cluster-credentials permissions")))
		return err
	} else if !ok {
		return ctx.JSON(http.StatusForbidden, Error{
			Message: pointer.ToString(errInsufficientPermissions.Error()),
		})
	}

	if err := validateDatabaseClusterRestore(ctx.Request().Context(), namespace, restore, e.kubeClient); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString(err.Error()),
		})
	}

	if dbCluster.Status.Status == everestv1alpha1.AppStateRestoring {
		e.l.Error("failed creating restore because another one is in progress")
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Another restore process for this DB cluster is currently in progress. Wait for its completion before initiating another."),
		})
	}

	return e.proxyKubernetes(ctx, namespace, databaseClusterRestoreKind, "")
}

// DeleteDatabaseClusterRestore Delete the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	return e.proxyKubernetes(ctx, namespace, databaseClusterRestoreKind, name)
}

// GetDatabaseClusterRestore Returns the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	return e.proxyKubernetes(ctx, namespace, databaseClusterRestoreKind, name)
}

// UpdateDatabaseClusterRestore Replace the specified cluster restore on the specified kubernetes cluster.
func (e *EverestServer) UpdateDatabaseClusterRestore(ctx echo.Context, namespace, name string) error {
	restore := &DatabaseClusterRestore{}
	if err := e.getBodyFromContext(ctx, restore); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseClusterRestore from the request body"),
		})
	}
	if err := validateMetadata(restore.Metadata); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	if err := validateDatabaseClusterRestore(ctx.Request().Context(), namespace, restore, e.kubeClient); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString(err.Error()),
		})
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterRestoreKind, name)
}
