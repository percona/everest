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
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"golang.org/x/mod/semver"

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
	if err := validateDatabaseEngineOperatorUpgradeParams(req); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString(err.Error()),
		})
	}
	// Get existing database engine.
	dbEngine, err := e.kubeClient.GetDatabaseEngine(ctx.Request().Context(), namespace, name)
	if err != nil {
		return err
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

type upgradePreflightCheckArgs struct {
	targetVersion  string
	engine         *everestv1alpha1.DatabaseEngine
	versionService versionservice.Interface
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
	allDatabases, err := e.kubeClient.ListDatabaseClusters(ctx.Request().Context(), namespace)
	if err != nil {
		return err
	}
	// Filter out databases of the provided engine type.
	databases := []everestv1alpha1.DatabaseCluster{}
	for _, db := range allDatabases.Items {
		if db.Spec.Engine.Type != engine.Spec.Type {
			continue
		}
		databases = append(databases, db)
	}

	args := upgradePreflightCheckArgs{
		targetVersion:  params.TargetVersion,
		engine:         engine,
		versionService: versionservice.New(e.config.VersionServiceURL),
	}
	reqCtx := ctx.Request().Context()
	result, err := e.runOperatorUpgradePreflightChecks(reqCtx, databases, args)
	if err != nil {
		return err
	}

	return ctx.JSON(http.StatusOK, result)
}

func validateDatabaseEngineOperatorUpgradeParams(req *DatabaseEngineOperatorUpgradeParams) error {
	targetVersion := req.TargetVersion
	if !strings.HasPrefix(targetVersion, "v") {
		targetVersion = "v" + targetVersion
	}
	if !semver.IsValid(targetVersion) {
		return fmt.Errorf("invalid target version '%s'", req.TargetVersion)
	}
	return nil
}

func (e *EverestServer) runOperatorUpgradePreflightChecks(
	ctx context.Context,
	dbs []everestv1alpha1.DatabaseCluster,
	args upgradePreflightCheckArgs,
) (*OperatorUpgradePreflight, error) {
	dbResults := make([]OperatorUpgradePreflightForDatabase, 0, len(dbs))
	for _, db := range dbs {
		// Check that the database engine is at the desired version.
		engineVersionValid, reqEngineVersion, err := e.validateDatabaseEngineVersionForOperatorUpgrade(ctx, db, args)
		if err != nil {
			return nil, errors.Join(err, errors.New("failed to validate database engine version for operator upgrade"))
		}
		if !engineVersionValid {
			dbResults = append(dbResults, OperatorUpgradePreflightForDatabase{
				Name:        pointer.To(db.GetName()),
				PendingTask: pointer.To(UpgradeEngine),
				Message: pointer.ToString(
					fmt.Sprintf("Upgrade DB version to %s", reqEngineVersion)),
			})
			continue
		}

		// Check that DB is at recommended CRVersion.
		if recCRVersion := db.Status.RecommendedCRVersion; recCRVersion != nil {
			dbResults = append(dbResults, OperatorUpgradePreflightForDatabase{
				Name:        pointer.To(db.GetName()),
				PendingTask: pointer.To(Restart),
				Message: pointer.ToString(
					fmt.Sprintf("Update CRVersion to %s", *recCRVersion)),
			})
			continue
		}

		// Database is in desired state for performing operator upgrade.
		dbResults = append(dbResults, OperatorUpgradePreflightForDatabase{
			Name:        pointer.To(db.GetName()),
			PendingTask: pointer.To(Ready),
		})
	}
	return &OperatorUpgradePreflight{
		Databases:      &dbResults,
		CurrentVersion: pointer.To(args.engine.Status.OperatorVersion),
	}, nil
}

// validateDatabaseEngineVersionForOperatorUpgrade validates that the provided database cluster
// is at the desired version to upgrade the operator to the targetVersion.
func (e *EverestServer) validateDatabaseEngineVersionForOperatorUpgrade(
	ctx context.Context,
	database everestv1alpha1.DatabaseCluster,
	args upgradePreflightCheckArgs,
) (bool, string, error) {
	engineType := args.engine.Spec.Type
	operator, found := versionservice.EngineTypeToOperatorName[engineType]
	if !found {
		return false, "", fmt.Errorf("unsupported engine type %s", engineType)
	}

	supportedVersions, err := args.versionService.GetSupportedEngineVersions(ctx, operator, args.targetVersion)
	if err != nil {
		return false, "", err
	}

	// GetSupportedEngineVersions always returns a non-zero length result.
	minVersion := supportedVersions[0]

	if !strings.HasPrefix(minVersion, "v") {
		minVersion = "v" + minVersion
	}

	currentVersion := database.Spec.Engine.Version
	if !strings.HasPrefix(currentVersion, "v") {
		currentVersion = "v" + currentVersion
	}

	// Current engine version should be greater than or equal to the minimum supported version.
	versionValid := semver.Compare(currentVersion, minVersion) >= 0
	return versionValid, minVersion, nil
}
