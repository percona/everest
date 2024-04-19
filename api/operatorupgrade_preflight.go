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
	"strings"

	"github.com/AlekSi/pointer"
	"golang.org/x/mod/semver"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	versionservice "github.com/percona/everest/pkg/version_service"
)

type upgradePreflightCheckArgs struct {
	targetVersion  string
	engine         *everestv1alpha1.DatabaseEngine
	versionService versionservice.Interface
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

		// Check that DB is running.
		if db.Status.Status != everestv1alpha1.AppStateReady {
			dbResults = append(dbResults, OperatorUpgradePreflightForDatabase{
				Name:        pointer.To(db.GetName()),
				PendingTask: pointer.To(NotReady),
				Message:     pointer.ToString("Database is not ready"),
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
		return false, "", errors.Join(err, errors.New("failed to get supported engine versions"))
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
	return versionValid, strings.TrimPrefix(minVersion, "v"), nil
}
