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
	"errors"
	"net/http"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
)

// authenticate is a middleware which authenticates a user by checking if the provided token is valid.
// If the user cannot be authenticated, the middleware returns "Unauthorized" response to the user.
func (e *EverestServer) authenticate(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		token, err := e.authToken(c)
		if err != nil {
			e.l.Error(err)
			return err
		}

		valid, err := e.auth.Valid(c.Request().Context(), token)
		if err != nil {
			e.l.Error(err)
			return c.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString("Could not verify authentication token"),
			})
		}

		if !valid {
			return c.JSON(http.StatusUnauthorized, Error{
				Message: pointer.ToString("Unauthorized"),
			})
		}

		return next(c)
	}
}

func (e *EverestServer) authToken(c echo.Context) (string, error) {
	var token string

	header := c.Request().Header.Get("Authorization")
	if s, found := strings.CutPrefix(header, "Bearer "); found && header != "" {
		token = s
	} else {
		cookie, err := c.Cookie("everest_token")
		if err != nil && !errors.Is(err, http.ErrNoCookie) {
			return "", errors.New("could not parse everest_token cookie")
		}
		if cookie != nil {
			token = cookie.Value
		}
	}

	return token, nil
}
