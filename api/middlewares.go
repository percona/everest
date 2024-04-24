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
	"slices"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (e *EverestServer) shouldAllowRequestDuringEngineUpgrade(c echo.Context) (bool, error) {
	// We allow read-only requests.
	if c.Request().Method == http.MethodGet {
		return true, nil
	}

	// List of subpaths that should be blocked when upgrading an operator.
	targetPaths := []string{
		"database-clusters",
		"database-engines",
		"database-cluster-restores",
		"database-cluster-backups",
	}

	// Check if the path matches any of the target paths.
	pathMatches := slices.ContainsFunc(targetPaths, func(targetPath string) bool {
		return strings.Contains(c.Request().URL.Path, targetPath)
	})
	if !pathMatches {
		return true, nil
	}

	namespace := c.Param("namespace")
	if namespace == "" {
		// We cannot infer the namespace, so we will return.
		return true, nil
	}

	engines, err := e.kubeClient.ListDatabaseEngines(c.Request().Context(), namespace)
	if err != nil {
		e.l.Error(err)
		return false, err
	}

	upgrading := slices.ContainsFunc(engines.Items, func(engine everestv1alpha1.DatabaseEngine) bool {
		return engine.Status.State == everestv1alpha1.DBEngineStateUpgrading
	})
	return !upgrading, nil
}

// checkOperatorUpgradeState is a middleware that checks if the operator is upgrading,
// and denies requests accordingly.
func (e *EverestServer) checkOperatorUpgradeState(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if allow, err := e.shouldAllowRequestDuringEngineUpgrade(c); err != nil {
			e.l.Error(err)
			return err
		} else if !allow {
			return c.JSON(http.StatusPreconditionFailed, Error{
				Message: pointer.ToString("Cannot perform this operation while the operator is upgrading"),
			})
		}
		return next(c)
	}
}
