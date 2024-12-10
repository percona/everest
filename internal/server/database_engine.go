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

// ListDatabaseEngines List of the available database engines on the specified namespace.
func (e *EverestServer) ListDatabaseEngines(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.ListDatabaseEngines(ctx.Request().Context(), user, namespace)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// GetDatabaseEngine Get the specified database engine on the specified namespace.
func (e *EverestServer) GetDatabaseEngine(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.GetDatabaseEngine(ctx.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)

}

// UpdateDatabaseEngine Update the specified database engine on the specified namespace.
func (e *EverestServer) UpdateDatabaseEngine(ctx echo.Context, namespace, name string) error {
	dbe := &everestv1alpha1.DatabaseEngine{}
	if err := e.getBodyFromContext(ctx, dbe); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, api.Error{
			Message: pointer.ToString("Could not get DatabaseEngine from the request body"),
		})
	}
	dbe.SetNamespace(namespace)

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.UpdateDatabaseEngine(ctx.Request().Context(), user, dbe)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// GetUpgradePlan gets the upgrade plan for the given namespace.
func (e *EverestServer) GetUpgradePlan(
	ctx echo.Context,
	namespace string,
) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	result, err := e.handler.GetUpgradePlan(ctx.Request().Context(), user, namespace)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}

// ApproveUpgradePlan starts the upgrade of operators in the provided namespace.
func (e *EverestServer) ApproveUpgradePlan(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	if err := e.handler.ApproveUpgradePlan(ctx.Request().Context(), user, namespace); err != nil {
		return err
	}
	return nil
}
