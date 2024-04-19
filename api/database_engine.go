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
	"net/http"
	"slices"

	"github.com/AlekSi/pointer"
	goversion "github.com/hashicorp/go-version"
	"github.com/labstack/echo/v4"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	databaseEngineKind = "databaseengines"
)

// ListDatabaseEngines List of the available database engines on the specified namespace.
func (e *EverestServer) ListDatabaseEngines(ctx echo.Context, namespace string) error {
	return e.proxyKubernetes(ctx, namespace, databaseEngineKind, "")
}

// GetDatabaseEngine Get the specified database engine on the specified namespace.
func (e *EverestServer) GetDatabaseEngine(ctx echo.Context, namespace, name string) error {
	return e.proxyKubernetes(ctx, namespace, databaseEngineKind, name)
}

// UpdateDatabaseEngine Update the specified database engine on the specified namespace.
func (e *EverestServer) UpdateDatabaseEngine(ctx echo.Context, namespace, name string) error {
	dbe := &DatabaseEngine{}
	if err := e.getBodyFromContext(ctx, dbe); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseEngine from the request body"),
		})
	}

	if err := validateMetadata(dbe.Metadata); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	return e.proxyKubernetes(ctx, namespace, databaseEngineKind, name)
}

// UpgradeDatabaseEngineOperator upgrades the database engine operator to the specified version.
func (e *EverestServer) UpgradeDatabaseEngineOperator(ctx echo.Context, namespace string, name string) error {
	// Parse request body.
	req := &DatabaseEngineOperatorUpgradeParams{}
	if err := e.getBodyFromContext(ctx, req); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString(
				"Could not get DatabaseEngineOperatorUpgradeParams from the request body"),
		})
	}

	// Get existing database engine.
	dbEngine, err := e.kubeClient.GetDatabaseEngine(ctx.Request().Context(), namespace, name)
	if err != nil {
		return err
	}

	if err := validateOperatorUpgradeVersion(dbEngine.Status.OperatorVersion, req.TargetVersion); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Failed to validate operator upgrade version: " + err.Error()),
		})
	}

	// Update annotation to start upgrade.
	annotations := dbEngine.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations[everestv1alpha1.DatabaseOperatorUpgradeAnnotation] = req.TargetVersion
	dbEngine.SetAnnotations(annotations)
	_, err = e.kubeClient.UpdateDatabaseEngine(ctx.Request().Context(), namespace, dbEngine)
	if err != nil {
		return err
	}
	return nil
}

// GetOperatorUpgradePreflight gets the preflight check results for upgrading the specified database engine operator.
func (e *EverestServer) GetOperatorUpgradePreflight(
	ctx echo.Context,
	namespace, name string,
	params GetOperatorUpgradePreflightParams,
) error {
	// Get existing database engine.
	engine, err := e.kubeClient.GetDatabaseEngine(ctx.Request().Context(), namespace, name)
	if err != nil {
		return err
	}
	// Get all database clusters in the namespace.
	databases, err := e.kubeClient.ListDatabaseClusters(ctx.Request().Context(), namespace)
	if err != nil {
		return err
	}
	// Filter out databases not using this engine type.
	databases.Items = slices.DeleteFunc(databases.Items, func(db everestv1alpha1.DatabaseCluster) bool {
		return db.Spec.Engine.Type != engine.Spec.Type
	})

	if err := validateOperatorUpgradeVersion(engine.Status.OperatorVersion, params.TargetVersion); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Failed to validate operator upgrade version: " + err.Error()),
		})
	}

	args := upgradePreflightCheckArgs{
		targetVersion:  params.TargetVersion,
		engine:         engine,
		versionService: versionservice.New(e.config.VersionServiceURL),
	}
	reqCtx := ctx.Request().Context()
	result, err := e.runOperatorUpgradePreflightChecks(reqCtx, databases.Items, args)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Failed to run preflight checks" + err.Error()),
		})
	}

	return ctx.JSON(http.StatusOK, result)
}

func validateOperatorUpgradeVersion(currentVersion, targetVersion string) error {
	targetsv, err := goversion.NewSemver(targetVersion)
	if err != nil {
		return err
	}
	currentsv, err := goversion.NewSemver(currentVersion)
	if err != nil {
		return err
	}
	if targetsv.LessThanOrEqual(currentsv) {
		return errors.New("target version must be greater than the current version")
	}
	return nil
}
