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

// ListBackupStorages lists backup storages.
func (e *EverestServer) ListBackupStorages(c echo.Context, namespace string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}

	ctx := c.Request().Context()
	list, err := e.handler.ListBackupStorages(ctx, user, namespace)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to list backup storages" + err.Error()),
		})
	}

	result := make([]api.BackupStorage, 0, len(list.Items))
	for _, s := range list.Items {
		out := &api.BackupStorage{}
		out.FromCR(&s)
		result = append(result, *out)
	}
	return c.JSON(http.StatusOK, result)
}

// CreateBackupStorage creates a new backup storage object.
func (e *EverestServer) CreateBackupStorage(c echo.Context, namespace string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	ctx := c.Request().Context()
	req := api.CreateBackupStorageParams{}
	if err := c.Bind(&req); err != nil {
		return err
	}
	result, err := e.handler.CreateBackupStorage(ctx, user, namespace, &req)
	if err != nil {
		return err
	}
	out := &api.BackupStorage{}
	out.FromCR(result)
	return c.JSON(http.StatusCreated, out)
}

// DeleteBackupStorage deletes the specified backup storage.
func (e *EverestServer) DeleteBackupStorage(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	ctx := c.Request().Context()
	if err := e.handler.DeleteBackupStorage(ctx, user, namespace, name); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// GetBackupStorage retrieves the specified backup storage.
func (e *EverestServer) GetBackupStorage(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	ctx := c.Request().Context()
	result, err := e.handler.GetBackupStorage(ctx, user, namespace, name)
	if err != nil {
		return err
	}

	out := &api.BackupStorage{}
	out.FromCR(result)
	return c.JSON(http.StatusOK, out)
}

// UpdateBackupStorage updates of the specified backup storage.
func (e *EverestServer) UpdateBackupStorage(c echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	ctx := c.Request().Context()
	req := api.UpdateBackupStorageParams{}
	if err := c.Bind(&req); err != nil {
		return err
	}
	result, err := e.handler.UpdateBackupStorage(ctx, user, namespace, name, &req)
	if err != nil {
		return err
	}
	out := &api.BackupStorage{}
	out.FromCR(result)
	return c.JSON(http.StatusOK, out)
}
