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
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/AlekSi/pointer"
	goversion "github.com/hashicorp/go-version"
	"github.com/labstack/echo/v4"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/rbac"
)

const (
	databaseClusterKind = "databaseclusters"
	// PXC default upload interval
	// https://github.com/percona/percona-xtradb-cluster-operator/blob/25ad952931b3760ba22f082aa827fecb0e48162e/pkg/apis/pxc/v1/pxc_types.go#L938
	pxcDefaultUploadInterval = 60
	// PSMDB default upload interval
	// https://github.com/percona/percona-server-mongodb-operator/blob/98b72fac893eeb8a96e366d49a70d3aaaa4e9ed4/pkg/apis/psmdb/v1/psmdb_defaults.go#L514
	psmdbDefaultUploadInterval = 600
	// PG default upload interval
	// https://github.com/percona/percona-postgresql-operator/blob/82673d4d80aa329b5bd985889121280caad064fb/internal/pgbackrest/postgres.go#L58
	pgDefaultUploadInterval = 60
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

	if err := e.validateDatabaseClusterOnCreate(ctx, namespace, dbc); err != nil {
		if errors.Is(err, errInsufficientPermissions) {
			return ctx.JSON(http.StatusForbidden, Error{
				Message: pointer.ToString("Cannot perform the operation due to insufficient permissions"),
			})
		}
		return err
	}

	err := e.proxyKubernetes(ctx, namespace, databaseClusterKind, "")
	if err == nil {
		// Collect metrics immediately after a DB cluster has been created.
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()

			if err := e.collectMetrics(ctx, *e.config); err != nil {
				e.l.Errorf("Could not send metrics: %s", err)
			}
		}()
	}

	return err
}

//nolint:gocognit
func (e *EverestServer) enforceDatabaseClusterRBAC(user string) func(l *unstructured.UnstructuredList) error {
	return func(l *unstructured.UnstructuredList) error {
		allowed := []unstructured.Unstructured{}
		for _, obj := range l.Items {
			db := &everestv1alpha1.DatabaseCluster{}
			if err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, db); err != nil {
				e.l.Error(errors.Join(err, errors.New("failed to convert unstructured to DatabaseCluster")))
				return err
			}
			allow := true
			// Check if the user has permissions for all backup-storages in the schedule?
			for _, sched := range db.Spec.Backup.Schedules {
				bsName := sched.BackupStorageName
				if ok, err := e.canGetBackupStorage(user, obj.GetNamespace(), bsName); err != nil {
					e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
					return err
				} else if !ok {
					allow = false
					break
				}
			}
			// Check if the user has permission for the backup-storages used by PITR (if any)?
			if bsName := pointer.Get(db.Spec.Backup.PITR.BackupStorageName); bsName != "" {
				if ok, err := e.canGetBackupStorage(user, obj.GetNamespace(), bsName); err != nil {
					e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
					return err
				} else if !ok {
					allow = false
				}
			}
			// Check if the user has permissions for MonitoringConfig?
			if mcName := pointer.Get(db.Spec.Monitoring).MonitoringConfigName; mcName != "" {
				if ok, err := e.canGetMonitoringConfig(user, obj.GetNamespace(), mcName); err != nil {
					e.l.Error(errors.Join(err, errors.New("failed to check monitoring-config permissions")))
					return err
				} else if !ok {
					allow = false
				}
			}
			if !allow {
				continue
			}
			allowed = append(allowed, obj)
		}
		l.Items = allowed
		return nil
	}
}

// ListDatabaseClusters lists the created database clusters on the specified kubernetes cluster.
func (e *EverestServer) ListDatabaseClusters(ctx echo.Context, namespace string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	rbacFilter := transformK8sList(e.enforceDatabaseClusterRBAC(user))
	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, "", rbacFilter)
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
			if err := e.ensureBackupStorageProtection(reqCtx, &backup); err != nil {
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
		if err := e.ensureBackupForegroundDeletion(reqCtx, &backup); err != nil {
			return errors.Join(err, errors.New("could not ensure foreground deletion"))
		}
	}
	return e.proxyKubernetes(ctx, namespace, databaseClusterKind, name)
}

// GetDatabaseCluster retrieves the specified database cluster on the specified kubernetes cluster.
func (e *EverestServer) GetDatabaseCluster(ctx echo.Context, namespace, name string) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	db, err := e.kubeClient.GetDatabaseCluster(ctx.Request().Context(), namespace, name)
	if err != nil {
		return err
	}
	// Check for backup-storage permissions.
	for _, sched := range db.Spec.Backup.Schedules {
		if ok, err := e.canGetBackupStorage(user, namespace, sched.BackupStorageName); err != nil {
			e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
			return err
		} else if !ok {
			return ctx.JSON(http.StatusForbidden, Error{
				Message: pointer.ToString(errInsufficientPermissions.Error()),
			})
		}
	}
	// Check if the user has permission for the backup-storages used by PITR (if any)?
	if bsName := pointer.Get(db.Spec.Backup.PITR.BackupStorageName); bsName != "" {
		if ok, err := e.canGetBackupStorage(user, namespace, bsName); err != nil {
			e.l.Error(errors.Join(err, errors.New("failed to check backup-storage permissions")))
			return err
		} else if !ok {
			return ctx.JSON(http.StatusForbidden, Error{
				Message: pointer.ToString(errInsufficientPermissions.Error()),
			})
		}
	}
	// Check for monitoring-config permissions.
	if mcName := pointer.Get(db.Spec.Monitoring).MonitoringConfigName; mcName != "" {
		if ok, err := e.canGetMonitoringConfig(user, namespace, mcName); err != nil {
			e.l.Error(errors.Join(err, errors.New("failed to check monitoring-config permissions")))
			return err
		} else if !ok {
			return ctx.JSON(http.StatusForbidden, Error{
				Message: pointer.ToString(errInsufficientPermissions.Error()),
			})
		}
	}
	// TODO: duplicate call to Kubernetes, need to figure out how to fix this.
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
				Name:     &c.Name, //nolint:exportloopref
				Started:  startedString,
				Ready:    &c.Ready, //nolint:exportloopref
				Restarts: pointer.ToInt(int(c.RestartCount)),
				Status:   &status,
			})
		}

		var started *string
		if startTime := pod.Status.StartTime; startTime != nil && !startTime.Time.IsZero() {
			started = pointer.ToString(pod.Status.StartTime.Time.Format(time.RFC3339))
		}
		res = append(res, DatabaseClusterComponent{
			Status:     pointer.ToString(string(pod.Status.Phase)),
			Name:       &pod.Name, //nolint:exportloopref
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

	if err := e.validateDatabaseClusterOnUpdate(ctx, dbc, oldDB); err != nil {
		if errors.Is(err, errInsufficientPermissions) {
			return ctx.JSON(http.StatusForbidden, Error{
				Message: pointer.ToString("Cannot perform the operation due to insufficient permissions"),
			})
		}
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
	c := ctx.Request().Context()
	response := &DatabaseClusterCredential{}
	switch databaseCluster.Spec.Engine.Type {
	case everestv1alpha1.DatabaseEnginePXC:
		response.Username = pointer.ToString("root")
		response.Password = pointer.ToString(string(secret.Data["root"]))
		response.ConnectionUrl = e.connectionURL(c, databaseCluster, *response.Username, *response.Password)
	case everestv1alpha1.DatabaseEnginePSMDB:
		response.Username = pointer.ToString(string(secret.Data["MONGODB_DATABASE_ADMIN_USER"]))
		response.Password = pointer.ToString(string(secret.Data["MONGODB_DATABASE_ADMIN_PASSWORD"]))
		response.ConnectionUrl = e.connectionURL(c, databaseCluster, *response.Username, *response.Password)
	case everestv1alpha1.DatabaseEnginePostgresql:
		response.Username = pointer.ToString("postgres")
		response.Password = pointer.ToString(string(secret.Data["password"]))
		response.ConnectionUrl = e.connectionURL(c, databaseCluster, *response.Username, *response.Password)
	default:
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString("Unsupported database engine")})
	}
	return ctx.JSON(http.StatusOK, response)
}

func (e *EverestServer) connectionURL(ctx context.Context, db *everestv1alpha1.DatabaseCluster, user, password string) *string {
	if db.Status.Hostname == "" {
		return nil
	}
	url := url.URL{User: url.UserPassword(user, url.QueryEscape(password))}
	switch db.Spec.Engine.Type {
	case everestv1alpha1.DatabaseEnginePXC:
		url.Scheme = "jdbc:mysql"
		url.Host = net.JoinHostPort(db.Status.Hostname, fmt.Sprint(db.Status.Port))
	case everestv1alpha1.DatabaseEnginePSMDB:
		hosts, err := psmdbHosts(ctx, db, e.kubeClient.GetPods)
		if err != nil {
			e.l.Error(err)
			return nil
		}
		url.Scheme = "mongodb"
		url.Host = hosts
	case everestv1alpha1.DatabaseEnginePostgresql:
		url.Scheme = "postgres"
		url.Host = net.JoinHostPort(db.Status.Hostname, fmt.Sprint(db.Status.Port))
	}
	return pointer.ToString(url.String())
}

func psmdbHosts(
	ctx context.Context,
	db *everestv1alpha1.DatabaseCluster,
	getPods func(ctx context.Context, namespace string, labelSelector *metav1.LabelSelector) (*corev1.PodList, error),
) (string, error) {
	// for sharded clusters use a single entry point (mongos)
	if db.Spec.Sharding != nil && db.Spec.Sharding.Enabled {
		return net.JoinHostPort(db.Status.Hostname, fmt.Sprint(db.Status.Port)), nil
	}
	// for non-sharded clusters use a list of comma-separated hosts from each node
	pods, err := getPods(ctx, db.Namespace, &metav1.LabelSelector{MatchLabels: map[string]string{
		"app.kubernetes.io/instance":  db.Name,
		"app.kubernetes.io/component": "mongod",
	}})
	if err != nil {
		return "", err
	}
	const maxHosts = 5
	hostPorts := make([]string, 0, maxHosts)
	for _, pod := range pods.Items {
		hostPorts = append(hostPorts, net.JoinHostPort(fmt.Sprintf("%s.%s", pod.Spec.Hostname, db.Status.Hostname), fmt.Sprint(db.Status.Port)))
	}
	return strings.Join(hostPorts, ","), nil
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

	latestBackup := latestSuccessfulBackup(backups.Items)

	backupTime := latestBackup.Status.CreatedAt.UTC()
	var latest *time.Time
	// if there is the LatestRestorableTime set in the CR, use it
	if latestBackup.Status.LatestRestorableTime != nil {
		latest = &latestBackup.Status.LatestRestorableTime.Time
	} else {
		// otherwise use heuristics based on the UploadInterval
		heuristicsInterval := getDefaultUploadInterval(databaseCluster.Spec.Engine, databaseCluster.Spec.Backup.PITR.UploadIntervalSec)
		latest = latestRestorableDate(time.Now(), backupTime, heuristicsInterval)
	}

	response.LatestDate = latest
	if response.LatestDate != nil {
		response.EarliestDate = &backupTime
	}
	response.LatestBackupName = &latestBackup.Name
	response.Gaps = &latestBackup.Status.Gaps

	return ctx.JSON(http.StatusOK, response)
}

func latestRestorableDate(now, latestBackupTime time.Time, heuristicsInterval int) *time.Time {
	// if heuristicsInterval is not set, then no latest restorable date available
	if heuristicsInterval == 0 {
		return nil
	}
	// delete nanoseconds since they're not accepted by restoration
	now = now.Truncate(time.Duration(now.Nanosecond()) * time.Nanosecond)
	// heuristic: latest restorable date is now minus uploadInterval
	date := now.Add(-time.Duration(heuristicsInterval) * time.Second).UTC()
	// not able to restore if after the latest backup passed less than uploadInterval time,
	// so in that case return nil
	if latestBackupTime.After(date) {
		return nil
	}
	return &date
}

func latestSuccessfulBackup(backups []everestv1alpha1.DatabaseClusterBackup) *everestv1alpha1.DatabaseClusterBackup {
	slices.SortFunc(backups, sortFunc)
	for _, backup := range backups {
		if backup.Status.State == everestv1alpha1.BackupSucceeded {
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

func getDefaultUploadInterval(engine everestv1alpha1.Engine, uploadInterval *int) int {
	version, err := goversion.NewVersion(engine.Version)
	if err != nil {
		return 0
	}
	switch engine.Type {
	case everestv1alpha1.DatabaseEnginePXC:
		// latest restorable time appeared in PXC 1.14.0
		if common.CheckConstraint(version, "<1.14.0") {
			return valueOrDefault(uploadInterval, pxcDefaultUploadInterval)
		}
	case everestv1alpha1.DatabaseEnginePSMDB:
		// latest restorable time appeared in PSMDB 1.16.0
		if common.CheckConstraint(version, "<1.16.0") {
			return valueOrDefault(uploadInterval, psmdbDefaultUploadInterval)
		}
	case everestv1alpha1.DatabaseEnginePostgresql:
		// latest restorable time appeared in PG 2.4.0
		if common.CheckConstraint(version, "<2.4.0") {
			return valueOrDefault(uploadInterval, pgDefaultUploadInterval)
		}
	}
	// for newer versions don't use the heuristics, so return 0 upload interval
	return 0
}

func valueOrDefault(value *int, defaultValue int) int {
	if value == nil {
		return defaultValue
	}
	return *value
}

// canTakeBackups checks if a given user is allowed to take backups.
func (e *EverestServer) canTakeBackups(user string, object string) (bool, error) {
	ok, err := e.rbacEnforcer.Enforce(
		user, rbac.ResourceDatabaseClusterBackups,
		rbac.ActionCreate,
		object,
	)
	if err != nil {
		return false, fmt.Errorf("failed to Enforce: %w", err)
	}
	return ok, nil
}

// canRestore checks if a given user is allowed to restore.
func (e *EverestServer) canRestore(user string, object string) (bool, error) {
	ok, err := e.rbacEnforcer.Enforce(
		user, rbac.ResourceDatabaseClusterRestores,
		rbac.ActionCreate,
		object,
	)
	if err != nil {
		return false, fmt.Errorf("failed to Enforce: %w", err)
	}
	return ok, nil
}
