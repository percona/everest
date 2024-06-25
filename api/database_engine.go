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
	"slices"

	"github.com/AlekSi/pointer"
	"github.com/cenkalti/backoff/v4"
	goversion "github.com/hashicorp/go-version"
	"github.com/labstack/echo/v4"
	"golang.org/x/net/context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	databaseEngineKind = "databaseengines"
)

var (
	errDBEngineUpgradeUnavailable   = errors.New("provided target version is not available for upgrade")
	errDBEngineInvalidTargetVersion = errors.New("invalid target version provided for upgrade")
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

// GetOperatorVersion returns the current version of the operator and the status of the database clusters.
func (e *EverestServer) GetOperatorVersion(c echo.Context, namespace, name string) error {
	ctx := c.Request().Context()
	engine, err := e.kubeClient.GetDatabaseEngine(ctx, namespace, name)
	if err != nil {
		return err
	}

	result := &OperatorVersion{
		CurrentVersion: pointer.To(engine.Status.OperatorVersion),
	}

	checks, err := e.checkDatabases(ctx, namespace, engine)
	if err != nil {
		return errors.Join(err, errors.New("failed to check databases"))
	}
	result.Databases = pointer.To(checks)
	return c.JSON(http.StatusOK, result)
}

// check the databases in the namespace from the perspective of operator version.
func (e *EverestServer) checkDatabases(
	ctx context.Context,
	namespace string, engine *everestv1alpha1.DatabaseEngine,
) ([]OperatorVersionCheckForDatabase, error) {
	// List all clusters in this namespace.
	clusters, err := e.kubeClient.ListDatabaseClusters(ctx, namespace)
	if err != nil {
		return nil, err
	}

	// Check that every cluster is using the recommended CRVersion.
	checks := []OperatorVersionCheckForDatabase{}
	for _, cluster := range clusters.Items {
		if cluster.Spec.Engine.Type != engine.Spec.Type {
			continue
		}
		check := OperatorVersionCheckForDatabase{
			Name: pointer.To(cluster.Name),
		}
		if recVer := cluster.Status.RecommendedCRVersion; recVer != nil {
			check.PendingTask = pointer.To(OperatorVersionCheckForDatabasePendingTaskRestart)
			check.Message = pointer.To(fmt.Sprintf("Database needs restart to use CRVersion '%s'", *recVer))
		}
		checks = append(checks, check)
	}
	return checks, nil
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

	// Check that this version is available for upgrade.
	if u := dbEngine.Status.GetPendingUpgrade(req.TargetVersion); u == nil {
		return errDBEngineUpgradeUnavailable
	}

	// Set a lock on the namespace.
	// This lock is released automatically by everest-operator upon the completion of the upgrade.
	if err := e.kubeClient.SetDatabaseEngineLock(ctx.Request().Context(), namespace, name, true); err != nil {
		return errors.Join(errors.New("failed to lock namespace"), err)
	}

	// Validate preflight checks.
	preflight, err := e.getOperatorUpgradePreflight(ctx.Request().Context(), req.TargetVersion, name, namespace)
	if err != nil {
		return err
	}
	if !canUpgrade(pointer.Get(preflight.Databases)) {
		// Release the lock.
		if err := e.kubeClient.SetDatabaseEngineLock(ctx.Request().Context(), namespace, name, false); err != nil {
			return errors.Join(err, errors.New("failed to release upgrade lock"))
		}
		return ctx.JSON(http.StatusPreconditionFailed, Error{
			Message: pointer.ToString("One or more database clusters are not ready for upgrade"),
		})
	}
	// Start the operator upgrade process.
	if err := e.startOperatorUpgradeWithRetry(ctx.Request().Context(), req.TargetVersion, namespace, name); err != nil {
		// Could not start the upgrade process, unlock the engine and return.
		if lockErr := e.kubeClient.SetDatabaseEngineLock(ctx.Request().Context(), namespace, name, false); lockErr != nil {
			err = errors.Join(err, errors.Join(lockErr, errors.New("failed to release upgrade lock")))
		}
		return err
	}
	return nil
}

// startOperatorUpgradeWithRetry wraps the startOperatorUpgrade function with a retry mechanism.
// This is done to reduce the chances of failures due to resource conflicts.
func (e *EverestServer) startOperatorUpgradeWithRetry(ctx context.Context, targetVersion, namespace, name string) error {
	return backoff.Retry(func() error {
		return e.startOperatorUpgrade(ctx, targetVersion, namespace, name)
	},
		backoff.WithContext(everestAPIConstantBackoff, ctx),
	)
}

// startOperatorUpgrade starts the operator upgrade process by adding the upgrade annotation to the database engine.
func (e *EverestServer) startOperatorUpgrade(ctx context.Context, targetVersion, namespace, name string) error {
	engine, err := e.kubeClient.GetDatabaseEngine(ctx, namespace, name)
	if err != nil {
		return err
	}
	// Update annotation to start upgrade.
	annotations := engine.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations[everestv1alpha1.DatabaseOperatorUpgradeAnnotation] = targetVersion
	engine.SetAnnotations(annotations)
	_, err = e.kubeClient.UpdateDatabaseEngine(ctx, namespace, engine)
	return err
}

func (e *EverestServer) getOperatorUpgradePreflight(ctx context.Context, targetVersion, name, namespace string) (*OperatorUpgradePreflight, error) {
	// Get existing database engine.
	engine, err := e.kubeClient.GetDatabaseEngine(ctx, namespace, name)
	if err != nil {
		return nil, err
	}
	// Get all database clusters in the namespace.
	databases, err := e.kubeClient.ListDatabaseClusters(ctx, namespace)
	if err != nil {
		return nil, err
	}
	// Filter out databases not using this engine type.
	databases.Items = slices.DeleteFunc(databases.Items, func(db everestv1alpha1.DatabaseCluster) bool {
		return db.Spec.Engine.Type != engine.Spec.Type
	})

	if err := validateOperatorUpgradeVersion(engine.Status.OperatorVersion, targetVersion); err != nil {
		return nil, err
	}

	args := upgradePreflightCheckArgs{
		targetVersion:  targetVersion,
		engine:         engine,
		versionService: versionservice.New(e.config.VersionServiceURL),
	}
	result, err := getUpgradePreflightChecksResult(ctx, databases.Items, args)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to run preflight checks"))
	}
	return result, nil
}

// GetOperatorUpgradePreflight gets the preflight check results for upgrading the specified database engine operator.
func (e *EverestServer) GetOperatorUpgradePreflight(
	ctx echo.Context,
	namespace, name string,
	params GetOperatorUpgradePreflightParams,
) error {
	result, err := e.getOperatorUpgradePreflight(ctx.Request().Context(), params.TargetVersion, name, namespace)
	if err != nil {
		code := http.StatusInternalServerError
		if errors.Is(err, errDBEngineInvalidTargetVersion) {
			code = http.StatusBadRequest
		}
		return ctx.JSON(code, Error{
			Message: pointer.To(err.Error()),
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
		return errors.Join(errDBEngineInvalidTargetVersion, errors.New("target version must be greater than the current version"))
	}
	return nil
}

func canUpgrade(dbs []OperatorUpgradePreflightForDatabase) bool {
	// Check if there is any database that is not ready.
	notReadyExists := slices.ContainsFunc(dbs, func(db OperatorUpgradePreflightForDatabase) bool {
		return pointer.Get(db.PendingTask) != OperatorUpgradePreflightForDatabasePendingTaskReady
	})
	return !notReadyExists
}
