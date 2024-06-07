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
	"sort"
	"strings"

	"github.com/AlekSi/pointer"
	goversion "github.com/hashicorp/go-version"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	versionservice "github.com/percona/everest/pkg/version_service"
)

type upgradePreflightCheckArgs struct {
	targetVersion  string
	engine         *everestv1alpha1.DatabaseEngine
	versionService versionservice.Interface
}

func getUpgradePreflightChecksResult(
	ctx context.Context,
	dbs []everestv1alpha1.DatabaseCluster,
	args upgradePreflightCheckArgs,
) (*OperatorUpgradePreflight, error) {
	// Check that this version is available for upgrade.
	if u := args.engine.Status.GetPendingUpgrade(args.targetVersion); u == nil {
		return nil, errDBEngineUpgradeUnavailable
	}

	// Perform checks for each given DB.
	dbResults := make([]OperatorUpgradePreflightForDatabase, 0, len(dbs))
	for _, db := range dbs {
		result, err := getUpgradePreflightCheckResultForDatabase(ctx, db, args)
		if err != nil {
			return nil, err
		}
		dbResults = append(dbResults, result)
	}

	// Sort by name.
	sort.Slice(dbResults, func(i, j int) bool {
		return strings.Compare(
			pointer.Get(dbResults[i].Name),
			pointer.Get(dbResults[j].Name),
		) < 0
	})

	return &OperatorUpgradePreflight{
		Databases:      &dbResults,
		CurrentVersion: pointer.To(args.engine.Status.OperatorVersion),
	}, nil
}

func getUpgradePreflightCheckResultForDatabase(
	ctx context.Context,
	database everestv1alpha1.DatabaseCluster,
	args upgradePreflightCheckArgs,
) (OperatorUpgradePreflightForDatabase, error) {
	// Check that the database engine is at the desired version.
	if valid, minReqVer, err := preflightCheckDBEngineVersion(ctx, database, args); err != nil {
		return OperatorUpgradePreflightForDatabase{},
			errors.Join(err, errors.New("failed to validate database engine version for operator upgrade"))
	} else if !valid {
		return OperatorUpgradePreflightForDatabase{
			Name:        pointer.To(database.GetName()),
			PendingTask: pointer.To(OperatorUpgradePreflightForDatabasePendingTaskUpgradeEngine),
			Message: pointer.ToString(
				fmt.Sprintf("Upgrade DB version to %s", minReqVer)),
		}, nil
	}

	// Check that DB is at recommended CRVersion.
	if recCRVersion := database.Status.RecommendedCRVersion; recCRVersion != nil {
		return OperatorUpgradePreflightForDatabase{
			Name:        pointer.To(database.GetName()),
			PendingTask: pointer.To(OperatorUpgradePreflightForDatabasePendingTaskRestart),
			Message: pointer.ToString(
				fmt.Sprintf("Update CRVersion to %s", *recCRVersion)),
		}, nil
	}

	// Check that DB is running.
	if database.Status.Status != everestv1alpha1.AppStateReady {
		return OperatorUpgradePreflightForDatabase{
			Name:        pointer.To(database.GetName()),
			PendingTask: pointer.To(OperatorUpgradePreflightForDatabasePendingTaskNotReady),
			Message:     pointer.ToString("Database is not ready"),
		}, nil
	}

	// Database is in desired state for performing operator upgrade.
	return OperatorUpgradePreflightForDatabase{
		Name:        pointer.To(database.GetName()),
		PendingTask: pointer.To(OperatorUpgradePreflightForDatabasePendingTaskReady),
	}, nil
}

// preflightCheckDBEngineVersion checks that the current database engine version is
// greater than or equal to the minimum supported version for the target operator version.
func preflightCheckDBEngineVersion(
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

	minVersion, err := goversion.NewVersion(supportedVersions[0]) // supported version will always return a non-zero length result.
	if err != nil {
		return false, "", err
	}

	currentVersion, err := goversion.NewVersion(database.Spec.Engine.Version)
	if err != nil {
		return false, "", err
	}
	return currentVersion.GreaterThanOrEqual(minVersion), minVersion.String(), nil
}
