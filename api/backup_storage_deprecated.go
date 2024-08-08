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

package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
)

// ListBackupStoragesV0 lists backup storages.
func (e *EverestServer) ListBackupStoragesV0(ctx echo.Context) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `GET /v1/namespaces/{namespace}/backupstorages` instead.",
		),
	})
}

// CreateBackupStorageV0 creates a new backup storage object.
func (e *EverestServer) CreateBackupStorageV0(ctx echo.Context) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `POST /v1/namespaces/{namespace}/backupstorages` instead.",
		),
	})
}

// DeleteBackupStorageV0 deletes the specified backup storage.
func (e *EverestServer) DeleteBackupStorageV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `DELETE /v1/namespaces/{namespace}/backupstorages/{name}` instead.",
		),
	})
}

// GetBackupStorageV0 retrieves the specified backup storage.
func (e *EverestServer) GetBackupStorageV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `GET /v1/namespaces/{namespace}/backupstorages/{name}` instead.",
		),
	})
}

// UpdateBackupStorageV0 updates of the specified backup storage.
func (e *EverestServer) UpdateBackupStorageV0(ctx echo.Context, _ string) error {
	return ctx.JSON(http.StatusMovedPermanently, Error{
		Message: pointer.To(
			"The usage of this API has been discontinued. " +
				"Use `PATCH /v1/namespaces/{namespace}/backupstorages/{name}` instead.",
		),
	})
}
