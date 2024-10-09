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
//
//nolint:dupl
package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
)

// CreateMonitoringInstanceV0 is discontinued and moved to CreateMonitoringInstance.
func (e *EverestServer) CreateMonitoringInstanceV0(ctx echo.Context) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `POST /v1/namespaces/{namespace}/monitoring-instances` instead.",
		),
	})
}

// ListMonitoringInstancesV0 is discontinued and moved to ListMonitoringInstances.
func (e *EverestServer) ListMonitoringInstancesV0(ctx echo.Context) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `GET /v1/namespaces/{namespace}/monitoring-instances` instead.",
		),
	})
}

// GetMonitoringInstanceV0 is discontinued and moved to GetMonitoringInstance.
func (e *EverestServer) GetMonitoringInstanceV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `GET /v1/namespaces/{namespace}/monitoring-instances/{name}` instead.",
		),
	})
}

// UpdateMonitoringInstanceV0 is discontinued and moved to UpdateMonitoringInstance.
func (e *EverestServer) UpdateMonitoringInstanceV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `PATCH /v1/namespaces/{namespace}/monitoring-instances/{name}` instead.",
		),
	})
}

// DeleteMonitoringInstanceV0 is discontinued and moved to DeleteMonitoringInstance.
func (e *EverestServer) DeleteMonitoringInstanceV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `DELETE /v1/namespaces/{namespace}/monitoring-instances/{name}` instead.",
		),
	})
}
