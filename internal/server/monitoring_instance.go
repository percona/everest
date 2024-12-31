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

package server

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

// CreateMonitoringInstance creates a new monitoring instance.
func (e *EverestServer) CreateMonitoringInstance(ctx echo.Context, namespace string) error {
	var params api.CreateMonitoringInstanceJSONRequestBody
	if err := ctx.Bind(&params); err != nil {
		return err
	}

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	created, err := e.handler.CreateMonitoringInstance(ctx.Request().Context(), user, namespace, &params)
	if err != nil {
		return err
	}

	out := &api.MonitoringInstance{}
	out.FromCR(created)
	return ctx.JSON(http.StatusOK, out)
}

// ListMonitoringInstances lists all monitoring instances.
func (e *EverestServer) ListMonitoringInstances(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	mcList, err := e.handler.ListMonitoringInstances(ctx.Request().Context(), user, namespace)
	if err != nil {
		return err
	}

	result := make([]*api.MonitoringInstance, 0, len(mcList.Items))
	for _, mc := range mcList.Items {
		out := &api.MonitoringInstance{}
		out.FromCR(&mc)
		result = append(result, out)
	}
	return ctx.JSON(http.StatusOK, result)
}

// GetMonitoringInstance retrieves a monitoring instance.
func (e *EverestServer) GetMonitoringInstance(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	m, err := e.handler.GetMonitoringInstance(ctx.Request().Context(), user, namespace, name)
	if err != nil {
		return err
	}

	out := &api.MonitoringInstance{}
	out.FromCR(m)
	return ctx.JSON(http.StatusOK, out)
}

// UpdateMonitoringInstance updates a monitoring instance based on the provided fields.
func (e *EverestServer) UpdateMonitoringInstance(ctx echo.Context, namespace, name string) error {
	var params api.UpdateMonitoringInstanceJSONRequestBody
	if err := ctx.Bind(&params); err != nil {
		return err
	}

	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	updated, err := e.handler.UpdateMonitoringInstance(ctx.Request().Context(), user, namespace, name, &params)
	if err != nil {
		return err
	}

	out := &api.MonitoringInstance{}
	out.FromCR(updated)
	return ctx.JSON(http.StatusOK, out)
}

// DeleteMonitoringInstance deletes a monitoring instance.
func (e *EverestServer) DeleteMonitoringInstance(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	if err := e.handler.DeleteMonitoringInstance(ctx.Request().Context(), user, namespace, name); err != nil {
		return err
	}

	return ctx.NoContent(http.StatusNoContent)
}
