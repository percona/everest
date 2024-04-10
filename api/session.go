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
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/percona/everest/pkg/kubernetes"
)

func (e *EverestServer) CreateSession(ctx echo.Context) error {
	var params UserCredentials
	if err := ctx.Bind(&params); err != nil {
		return err
	}

	c := ctx.Request().Context()
	err := e.sessionMgr.VerifyUsernamePassword(c, *params.Username, *params.Password)
	if err != nil {
		return err
	}

	uniqueId, err := uuid.NewRandom()
	if err != nil {
		return err
	}
	jwtToken, err := e.sessionMgr.Create(
		fmt.Sprintf("%s:%s", *params.Username, kubernetes.AccountCapabilityLogin),
		int64((time.Hour * 24).Seconds()),
		uniqueId.String())
	if err != nil {
		return err
	}

	return ctx.JSON(http.StatusOK, map[string]string{"token": jwtToken})
}
