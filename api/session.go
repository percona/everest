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
	"time"

	"github.com/AlekSi/pointer"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/percona/everest/pkg/accounts"
	"github.com/percona/everest/pkg/common"
)

const (
	jwtSubjectTml    = "%s:%s" // username:capability
	jwtDefaultExpiry = time.Hour * 24
)

// CreateSession creates a new session.
func (e *EverestServer) CreateSession(ctx echo.Context) error {
	var params UserCredentials
	if err := ctx.Bind(&params); err != nil {
		return err
	}

	c := ctx.Request().Context()
	err := e.sessionMgr.Authenticate(c, *params.Username, *params.Password)
	if err != nil {
		return sessionErrToHTTPRes(ctx, err)
	}

	uniqueID, err := uuid.NewRandom()
	if err != nil {
		return err
	}
	subject := fmt.Sprintf(jwtSubjectTml, *params.Username, accounts.AccountCapabilityLogin)
	secondsBeforeExpiry := int64(jwtDefaultExpiry.Seconds())

	jwtToken, err := e.sessionMgr.Create(subject, secondsBeforeExpiry, uniqueID.String())
	if err != nil {
		return err
	}

	ctx.SetCookie(&http.Cookie{
		Name:  common.EverestTokenCookie,
		Value: jwtToken,
	})
	return ctx.JSON(http.StatusOK, map[string]string{"token": jwtToken})
}

func sessionErrToHTTPRes(ctx echo.Context, err error) error {
	if errors.Is(err, accounts.ErrAccountNotFound) ||
		errors.Is(err, accounts.ErrIncorrectPassword) {
		return ctx.JSON(http.StatusUnauthorized, Error{
			Message: pointer.To("Incorrect username or password provided"),
		})
	}

	if errors.Is(err, accounts.ErrAccountDisabled) {
		return ctx.JSON(http.StatusForbidden, Error{
			Message: pointer.To("User account is disabled"),
		})
	}

	if errors.Is(err, accounts.ErrInsufficientCapabilities) {
		return ctx.JSON(http.StatusForbidden, Error{
			Message: pointer.To("User account lacks required capabilities"),
		})
	}
	return err
}
