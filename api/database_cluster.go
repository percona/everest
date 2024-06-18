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
	"slices"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	databaseClusterKind = "databaseclusters"
)

// CreateDatabaseCluster creates a new db cluster inside the given k8s cluster.
func (e *EverestServer) CreateDatabaseCluster(ctx echo.Context, namespace string) error {
	dbc := &DatabaseCluster{}
	if err := e.getBodyFromContext(ctx, dbc); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseCluster from the request body"),
		})
	}

	if err := e.validateDatabaseClusterCR(ctx, namespace, dbc); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}

	err := e.proxyKubernetes(ctx, namespace, databaseClusterKind, "")
	if err == nil {
		// Collect metrics immediately after a DB cluster has been created.
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()

			if err := e.collectMetrics(ctx, e.config.TelemetryURL); err != nil {
				e.l.Errorf("Could not send metrics: %s", err)
			}
		}()
	}

	return err
}

// ListDatabaseClusters lists the created database clusters on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusters(ctx echo.Context, namespace string) error {
	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, "")
}

// DeleteDatabaseCluster deletes a database cluster on the specified kubernetes cluster.
func (e *EverestServer) DeleteDatabaseCluster(
	ctx echo.Context,
	namespace, name string,
	params DeleteDatabaseClusterParams,
) error {
	cleanupStorage := pointer.Get(params.CleanupBackupStorage)
	reqCtx := ctx.Request().Context()

	backups, err := e.kubeClient.ListDatabaseClusterBackups(reqCtx, namespace, metav1.ListOptions{})
	if err != nil {
		return errors.Join(err, errors.New("could not list database backups"))
	}

	if !cleanupStorage {
		for _, backup := range backups.Items {
			// Doesn't belong to this cluster, skip.
			if backup.Spec.DBClusterName != name || !backup.GetDeletionTimestamp().IsZero() {
				continue
			}
			if err := e.ensureBackupStorageProtection(reqCtx, &backup); err != nil { //nolint:gosec
				return errors.Join(err, errors.New("could not ensure backup storage protection"))
			}
		}
	}

	// Ensure foreground deletion on the Backups,
	// so that they're visible on the UI while getting deleted.
	for _, backup := range backups.Items {
		// Doesn't belong to this cluster, skip.
		if backup.Spec.DBClusterName != name || !backup.GetDeletionTimestamp().IsZero() {
			continue
		}
		if err := e.ensureBackupForegroundDeletion(reqCtx, &backup); err != nil { //nolint:gosec
			return errors.Join(err, errors.New("could not ensure foreground deletion"))
		}
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, name)
}

// GetDatabaseCluster retrieves the specified database cluster on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseCluster(ctx echo.Context, namespace, name string) error {
	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, name)
}

// GetDatabaseClusterComponents returns database cluster components.
//
//nolint:funlen
func (e *EverestServer) GetDatabaseClusterComponents(ctx echo.Context, namespace, name string) error {
	pods, err := e.kubeClient.GetPods(ctx.Request().Context(), namespace, &metav1.LabelSelector{
		MatchLabels: map[string]string{"app.kubernetes.io/instance": name},
	})
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString("Could not get pods")})
	}

	res := make([]DatabaseClusterComponent, 0, len(pods.Items))
	for _, pod := range pods.Items {
		component := pod.Labels["app.kubernetes.io/component"]
		if component == "" {
			continue
		}

		restarts := 0
		ready := 0
		containers := make([]DatabaseClusterComponentContainer, 0, len(pod.Status.ContainerStatuses))
		for _, c := range pod.Status.ContainerStatuses {
			restarts += int(c.RestartCount)
			if c.Ready {
				ready++
			}
			var started time.Time
			if c.State.Running != nil {
				started = c.State.Running.StartedAt.Time
			}

			var status string
			switch {
			case c.State.Running != nil:
				status = "Running"
			case c.State.Waiting != nil:
				status = "Waiting"
			case c.State.Terminated != nil:
				status = "Terminated"
			}

			var startedString *string
			if !started.IsZero() {
				startedString = pointer.ToString(started.Format(time.RFC3339))
			}
			containers = append(containers, DatabaseClusterComponentContainer{
				Name:     &c.Name, //nolint:gosec,exportloopref
				Started:  startedString,
				Restarts: pointer.ToInt(int(c.RestartCount)),
				Status:   &status,
			})
		}

		var started *string
		if !pod.Status.StartTime.Time.IsZero() {
			started = pointer.ToString(pod.Status.StartTime.Time.Format(time.RFC3339))
		}
		res = append(res, DatabaseClusterComponent{
			Status:     pointer.ToString(string(pod.Status.Phase)),
			Name:       &pod.Name, //nolint:gosec,exportloopref
			Type:       &component,
			Started:    started,
			Restarts:   pointer.ToInt(restarts),
			Ready:      pointer.ToString(fmt.Sprintf("%d/%d", ready, len(pod.Status.ContainerStatuses))),
			Containers: &containers,
		})
	}

	return ctx.JSON(http.StatusOK, res)
}

// UpdateDatabaseCluster replaces the specified database cluster on the specified kubernetes cluster.
func (e *EverestServer) UpdateDatabaseCluster(ctx echo.Context, namespace, name string) error {
	dbc := &DatabaseCluster{}
	if err := e.getBodyFromContext(ctx, dbc); err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not get DatabaseCluster from the request body"),
		})
	}

	if err := validateMetadata(dbc.Metadata); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}

	if err := e.validateDatabaseClusterCR(ctx, namespace, dbc); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}

	oldDB, err := e.kubeClient.GetDatabaseCluster(ctx.Request().Context(), namespace, name)
	if err != nil {
		return errors.Join(err, errors.New("could not get old Database Cluster"))
	}
	if err := validateDatabaseClusterOnUpdate(dbc, oldDB); err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}

	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, name)
}

// GetDatabaseClusterCredentials returns credentials for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterCredentials(ctx echo.Context, namespace, name string) error {
	databaseCluster, err := e.kubeClient.GetDatabaseCluster(ctx.Request().Context(), namespace, name)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString(err.Error())})
	}
	secret, err := e.kubeClient.GetSecret(ctx.Request().Context(), namespace, databaseCluster.Spec.Engine.UserSecretsName)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString(err.Error())})
	}
	response := &DatabaseClusterCredential{}
	switch databaseCluster.Spec.Engine.Type {
	case everestv1alpha1.DatabaseEnginePXC:
		response.Username = pointer.ToString("root")
		response.Password = pointer.ToString(string(secret.Data["root"]))
	case everestv1alpha1.DatabaseEnginePSMDB:
		response.Username = pointer.ToString(string(secret.Data["MONGODB_DATABASE_ADMIN_USER"]))
		response.Password = pointer.ToString(string(secret.Data["MONGODB_DATABASE_ADMIN_PASSWORD"]))
	case everestv1alpha1.DatabaseEnginePostgresql:
		response.Username = pointer.ToString("postgres")
		response.Password = pointer.ToString(string(secret.Data["password"]))
	default:
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString("Unsupported database engine")})
	}

	return ctx.JSON(http.StatusOK, response)
}

// GetDatabaseClusterPitr returns the point-in-time recovery related information for the specified database cluster.
func (e *EverestServer) GetDatabaseClusterPitr(ctx echo.Context, namespace, name string) error {
	databaseCluster, err := e.kubeClient.GetDatabaseCluster(ctx.Request().Context(), namespace, name)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString(err.Error())})
	}

	response := &DatabaseClusterPitr{}
	if !databaseCluster.Spec.Backup.Enabled || !databaseCluster.Spec.Backup.PITR.Enabled {
		return ctx.JSON(http.StatusOK, response)
	}

	options := metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				"clusterName": name,
			},
		}),
	}
	backups, err := e.kubeClient.ListDatabaseClusterBackups(ctx.Request().Context(), namespace, options)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString(err.Error())})
	}
	if len(backups.Items) == 0 {
		return ctx.JSON(http.StatusOK, response)
	}

	latestBackup := latestSuccessfulBackup(backups.Items, databaseCluster.Spec.Engine.Type)

	uploadInterval := getDefaultUploadInterval(databaseCluster.Spec.Engine.Type, databaseCluster.Spec.Backup.PITR.UploadIntervalSec)
	backupTime := latestBackup.Status.CreatedAt.UTC()
	latest := latestRestorableDate(time.Now(), backupTime, uploadInterval)

	response.LatestDate = latest
	if response.LatestDate != nil {
		response.EarliestDate = &backupTime
	}
	response.LatestBackupName = &latestBackup.Name
	response.Gaps = &latestBackup.Status.Gaps

	return ctx.JSON(http.StatusOK, response)
}

func latestRestorableDate(now, latestBackupTime time.Time, uploadInterval int) *time.Time {
	// delete nanoseconds since they're not accepted by restoration
	now = now.Truncate(time.Duration(now.Nanosecond()) * time.Nanosecond)
	// heuristic: latest restorable date is now minus uploadInterval
	date := now.Add(-time.Duration(uploadInterval) * time.Second).UTC()
	// not able to restore if after the latest backup passed less than uploadInterval time,
	// so in that case return nil
	if latestBackupTime.After(date) {
		return nil
	}
	return &date
}

func latestSuccessfulBackup(backups []everestv1alpha1.DatabaseClusterBackup, engineType everestv1alpha1.EngineType) *everestv1alpha1.DatabaseClusterBackup {
	slices.SortFunc(backups, sortFunc)
	for _, backup := range backups {
		if successStatus(backup.Status.State, engineType) {
			return &backup
		}
	}
	return nil
}

func sortFunc(a, b everestv1alpha1.DatabaseClusterBackup) int {
	if a.Status.CreatedAt == nil {
		return 1
	}
	if b.Status.CreatedAt == nil {
		return -1
	}
	if b.Status.CreatedAt.After(a.Status.CreatedAt.Time) {
		return 1
	}
	return -1
}

func successStatus(state everestv1alpha1.BackupState, engineType everestv1alpha1.EngineType) bool {
	var successState string
	switch engineType {
	case everestv1alpha1.DatabaseEnginePXC:
		successState = "Succeeded"
	case everestv1alpha1.DatabaseEnginePSMDB:
		successState = "ready"
	case everestv1alpha1.DatabaseEnginePostgresql:
		successState = "Succeeded"
	}
	return string(state) == successState
}

func getDefaultUploadInterval(engineType everestv1alpha1.EngineType, uploadInterval *int) int {
	if uploadInterval != nil {
		return *uploadInterval
	}
	switch engineType {
	case everestv1alpha1.DatabaseEnginePXC:
		// PXC default upload interval
		// https://github.com/percona/percona-xtradb-cluster-operator/blob/25ad952931b3760ba22f082aa827fecb0e48162e/pkg/apis/pxc/v1/pxc_types.go#L938
		return 60
	case everestv1alpha1.DatabaseEnginePSMDB:
		// PSMDB default upload interval
		// https://github.com/percona/percona-server-mongodb-operator/blob/98b72fac893eeb8a96e366d49a70d3aaaa4e9ed4/pkg/apis/psmdb/v1/psmdb_defaults.go#L514
		return 600
	case everestv1alpha1.DatabaseEnginePostgresql:
		// PG default upload interval
		// https://github.com/percona/percona-postgresql-operator/blob/82673d4d80aa329b5bd985889121280caad064fb/internal/pgbackrest/postgres.go#L58
		return 60
	}
	return 0
}
