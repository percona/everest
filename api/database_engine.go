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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	databaseEngineKind = "databaseengines"
)

var (
	errDBEngineUpgradeUnavailable   = errors.New("provided target version is not available for upgrade")
	errDBEngineInvalidTargetVersion = errors.New("invalid target version provided for upgrade")
)

type operatorUpgradePreflight struct {
	currentVersion string        `json:"currentVersion,omitempty"`
	databases      []UpgradeTask `json:"databases,omitempty"`
}

// ListDatabaseEngines List of the available database engines on the specified namespace.
func (e *EverestServer) ListDatabaseEngines(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	rbacListFilter := transformK8sList(func(l *unstructured.UnstructuredList) error {
		allowed := []unstructured.Unstructured{}
		for _, obj := range l.Items {
			if can, err := e.canGetDatabaseEngine(user, namespace, obj.GetName()); err != nil {
				e.l.Error(errors.Join(err, errors.New("failed to check database-engine permissions")))
				return err
			} else if !can {
				continue
			}
			allowed = append(allowed, obj)
		}
		l.Items = allowed
		return nil
	})
	return e.proxyKubernetes(ctx, namespace, databaseEngineKind, "", rbacListFilter)
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

// GetUpgradePlan gets the upgrade plan for the given namespace.
func (e *EverestServer) GetUpgradePlan(
	c echo.Context,
	namespace string,
) error {
	ctx := c.Request().Context()
	result, err := e.getUpgradePlan(ctx, namespace)
	if err != nil {
		e.l.Errorf("Cannot get upgrade plan: %w", err)
		return err
	}

	// No upgrades available, so we will check if our clusters are ready for current version.
	if len(pointer.Get(result.Upgrades)) == 0 {
		result.PendingActions = pointer.To([]UpgradeTask{})
		engines, err := e.kubeClient.ListDatabaseEngines(ctx, namespace)
		if err != nil {
			return err
		}
		for _, engine := range engines.Items {
			tasks, err := e.getDBPostUpgradeTasks(ctx, &engine)
			if err != nil {
				e.l.Errorf("Failed to check databases: %w", err)
				return err
			}
			for _, t := range tasks {
				*result.PendingActions = append(*result.PendingActions, UpgradeTask{
					Name:        t.Name,
					PendingTask: t.PendingTask,
					Message:     t.Message,
				})
			}
		}
	}
	return c.JSON(http.StatusOK, result)
}

// ApproveUpgradePlan starts the upgrade of operators in the provided namespace.
func (e *EverestServer) ApproveUpgradePlan(c echo.Context, namespace string) error {
	ctx := c.Request().Context()

	up, err := e.getUpgradePlan(ctx, namespace)
	if err != nil {
		e.l.Errorf("Cannot get upgrade plan: %w", err)
		return err
	}

	// lock all engines that will be upgraded.
	if err := e.setLockDBEnginesForUpgrade(ctx, namespace, up, true); err != nil {
		e.l.Errorf("Cannot lock engines: %w", err)
		return errors.Join(err, errors.New("failed to lock engines"))
	}

	// Check if we're ready to upgrade?
	if slices.ContainsFunc(pointer.Get(up.PendingActions), func(task UpgradeTask) bool {
		return pointer.Get(task.PendingTask) != Ready
	}) {
		// Not ready for upgrade, release the lock and return a failured message.
		if err := e.setLockDBEnginesForUpgrade(ctx, namespace, up, false); err != nil {
			return errors.Join(err, errors.New("failed to release lock"))
		}
		return c.JSON(http.StatusPreconditionFailed, Error{
			Message: pointer.ToString("One or more database clusters are not ready for upgrade"),
		})
	}

	// start upgrade process.
	if err := e.startOperatorUpgradeWithRetry(ctx, "", namespace, ""); err != nil {
		e.l.Errorf("Failed to upgrade operators: %w", err)
		// Upgrade has failed, so we release the lock.
		if err := e.setLockDBEnginesForUpgrade(ctx, namespace, up, false); err != nil {
			e.l.Errorf("Cannot unlock engines: %w", err)
			return errors.Join(err, errors.New("failed to release lock"))
		}
		return err
	}
	return nil
}

func (e *EverestServer) getUpgradePlan(
	ctx context.Context,
	namespace string,
) (*UpgradePlan, error) {
	engines, err := e.kubeClient.ListDatabaseEngines(ctx, namespace)
	if err != nil {
		return nil, err
	}

	result := &UpgradePlan{
		Upgrades:       pointer.To([]Upgrade{}),
		PendingActions: pointer.To([]UpgradeTask{}),
	}

	for _, engine := range engines.Items {
		nextVersion := engine.Status.GetNextUpgradeVersion()
		if nextVersion == "" {
			continue
		}

		upgrade := &Upgrade{
			CurrentVersion: pointer.To(engine.Status.OperatorVersion),
			Name:           pointer.To(engine.GetName()),
			TargetVersion:  pointer.To(nextVersion),
		}
		*result.Upgrades = append(*result.Upgrades, *upgrade)
		pf, err := e.getOperatorUpgradePreflight(ctx, nextVersion, &engine)
		if err != nil {
			return nil, err
		}
		for _, db := range pointer.Get(pf).databases {
			*result.PendingActions = append(*result.PendingActions, db)
		}
	}
	return result, nil
}

func (e *EverestServer) setLockDBEnginesForUpgrade(
	ctx context.Context,
	namespace string,
	up *UpgradePlan,
	lock bool,
) error {
	return backoff.Retry(func() error {
		for _, upgrade := range pointer.Get(up.Upgrades) {
			if err := e.kubeClient.SetDatabaseEngineLock(ctx, namespace, pointer.Get(upgrade.Name), lock); err != nil {
				return err
			}
		}
		return nil
	}, backoff.WithContext(everestAPIConstantBackoff, ctx),
	)
}

func (e *EverestServer) getDBPostUpgradeTasks(
	ctx context.Context,
	engine *everestv1alpha1.DatabaseEngine,
) ([]UpgradeTask, error) {
	namespace := engine.GetNamespace()
	// List all clusters in this namespace.
	clusters, err := e.kubeClient.ListDatabaseClusters(ctx, namespace)
	if err != nil {
		return nil, err
	}

	// Check that every cluster is using the recommended CRVersion.
	checks := []UpgradeTask{}
	for _, cluster := range clusters.Items {
		if cluster.Spec.Engine.Type != engine.Spec.Type {
			continue
		}
		check := UpgradeTask{
			Name: pointer.To(cluster.Name),
		}
		check.PendingTask = pointer.To(Ready)
		if recVer := cluster.Status.RecommendedCRVersion; recVer != nil {
			check.PendingTask = pointer.To(Restart)
			check.Message = pointer.To(fmt.Sprintf("Database needs restart to use CRVersion '%s'", *recVer))
		}
		checks = append(checks, check)
	}
	return checks, nil
}

// startOperatorUpgradeWithRetry wraps the startOperatorUpgrade function with a retry mechanism.
// This is done to reduce the chances of failures due to resource conflicts.
//
// TODO: remove/refactor this once deprecated APIs are removed.
// There are unused parameters in this function to maintain backward compatibility with deprecated APIs.
func (e *EverestServer) startOperatorUpgradeWithRetry(ctx context.Context, targetVersion, namespace, name string) error {
	return backoff.Retry(func() error {
		return e.startOperatorUpgrade(ctx, targetVersion, namespace, name)
	},
		backoff.WithContext(everestAPIConstantBackoff, ctx),
	)
}

// TODO: remove/refactor this once deprecated APIs are removed.
func (e *EverestServer) startOperatorUpgrade(ctx context.Context, _, namespace, _ string) error {
	engines, err := e.kubeClient.ListDatabaseEngines(ctx, namespace)
	if err != nil {
		return err
	}

	// gather install plans to approve.
	installPlans := []string{}
	for _, engine := range engines.Items {
		nextVer := engine.Status.GetNextUpgradeVersion()
		if nextVer == "" {
			continue
		}
		for _, pending := range engine.Status.PendingOperatorUpgrades {
			if pending.TargetVersion == nextVer {
				installPlans = append(installPlans, pending.InstallPlanRef.Name)
			}
		}
	}

	// de-duplicate the list.
	slices.Sort(installPlans)
	installPlans = slices.Compact(installPlans)

	// approve install plans.
	for _, plan := range installPlans {
		if err := backoff.Retry(func() error {
			_, err := e.kubeClient.ApproveInstallPlan(ctx, namespace, plan)
			return err
		}, backoff.WithContext(everestAPIConstantBackoff, ctx),
		); err != nil {
			return err
		}
	}
	return nil
}

func (e *EverestServer) getOperatorUpgradePreflight(
	ctx context.Context,
	targetVersion string,
	engine *everestv1alpha1.DatabaseEngine,
) (*operatorUpgradePreflight, error) {
	namespace := engine.GetNamespace()
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

func canUpgrade(dbs []UpgradeTask) bool {
	// Check if there is any database that is not ready.
	notReadyExists := slices.ContainsFunc(dbs, func(db UpgradeTask) bool {
		return pointer.Get(db.PendingTask) != Ready
	})
	return !notReadyExists
}

// canGetDatabaseEngine checks if the user can get the specified database engine.
func (e *EverestServer) canGetDatabaseEngine(user, namespace, name string) (bool, error) {
	ok, err := e.rbacEnforcer.Enforce(
		user, rbac.ResourceDatabaseEngines,
		rbac.ActionRead,
		fmt.Sprintf("%s/%s", namespace, name),
	)
	if err != nil {
		return false, fmt.Errorf("failed to Enforce: %w", err)
	}
	return ok, nil
}
