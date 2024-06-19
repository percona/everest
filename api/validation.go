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
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/AlekSi/pointer"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	"golang.org/x/mod/semver"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/cmd/config"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	pxcDeploymentName   = "percona-xtradb-cluster-operator"
	psmdbDeploymentName = "percona-server-mongodb-operator"
	pgDeploymentName    = "percona-postgresql-operator"
	dateFormat          = "2006-01-02T15:04:05Z"
	pgReposLimit        = 3
)

var (
	minStorageQuantity = resource.MustParse("1G")   //nolint:gochecknoglobals
	minCPUQuantity     = resource.MustParse("600m") //nolint:gochecknoglobals
	minMemQuantity     = resource.MustParse("512M") //nolint:gochecknoglobals

	errDBCEmptyMetadata              = errors.New("databaseCluster's Metadata should not be empty")
	errDBCNameEmpty                  = errors.New("databaseCluster's metadata.name should not be empty")
	errDBCNamespaceEmpty             = errors.New("databaseCluster's metadata.namespace should not be empty")
	errDBCNameWrongFormat            = errors.New("databaseCluster's metadata.name should be a string")
	errDBCNamespaceWrongFormat       = errors.New("databaseCluster's metadata.namespace should be a string")
	errNotEnoughMemory               = fmt.Errorf("memory limits should be above %s", minMemQuantity.String())
	errInt64NotSupported             = errors.New("specifying resources using int64 data type is not supported. Please use string format for that")
	errNotEnoughCPU                  = fmt.Errorf("CPU limits should be above %s", minCPUQuantity.String())
	errNotEnoughDiskSize             = fmt.Errorf("storage size should be above %s", minStorageQuantity.String())
	errUnsupportedPXCProxy           = errors.New("you can use either HAProxy or Proxy SQL for PXC clusters")
	errUnsupportedPGProxy            = errors.New("you can use only PGBouncer as a proxy type for Postgres clusters")
	errUnsupportedPSMDBProxy         = errors.New("you can use only Mongos as a proxy type for MongoDB clusters")
	errNoSchedules                   = errors.New("please specify at least one backup schedule")
	errNoNameInSchedule              = errors.New("'name' field for the backup schedules cannot be empty")
	errScheduleNoBackupStorageName   = errors.New("'backupStorageName' field cannot be empty when schedule is enabled")
	errPitrNoBackupStorageName       = errors.New("'backupStorageName' field cannot be empty when pitr is enabled")
	errNoResourceDefined             = errors.New("please specify resource limits for the cluster")
	errPitrUploadInterval            = errors.New("'uploadIntervalSec' should be more than 0")
	errPXCPitrS3Only                 = errors.New("point-in-time recovery only supported for s3 compatible storages")
	errPSMDBMultipleStorages         = errors.New("can't use more than one backup storage for PSMDB clusters")
	errPSMDBViolateActiveStorage     = errors.New("can't change the active storage for PSMDB clusters")
	errDataSourceConfig              = errors.New("either DBClusterBackupName or BackupSource must be specified in the DataSource field")
	errDataSourceNoPitrDateSpecified = errors.New("pitr Date must be specified for type Date")
	errDataSourceWrongDateFormat     = errors.New("failed to parse .Spec.DataSource.Pitr.Date as 2006-01-02T15:04:05Z")
	errDataSourceNoBackupStorageName = errors.New("'backupStorageName' should be specified in .Spec.DataSource.BackupSource")
	errDataSourceNoPath              = errors.New("'path' should be specified in .Spec.DataSource.BackupSource")
	errIncorrectDataSourceStruct     = errors.New("incorrect data source struct")
	errUnsupportedPitrType           = errors.New("the given point-in-time recovery type is not supported")
	errTooManyPGSchedules            = fmt.Errorf("only %d schedules are allowed in a PostgreSQL cluster", pgReposLimit)
	errTooManyPGStorages             = fmt.Errorf("only %d different storages are allowed in a PostgreSQL cluster", pgReposLimit)
	errNoMetadata                    = fmt.Errorf("no metadata provided")
	errInvalidResourceVersion        = fmt.Errorf("invalid 'resourceVersion' value")
	errInvalidBucketName             = fmt.Errorf("invalid bucketName")
	errInvalidVersion                = errors.New("invalid database engine version provided")
	errDBEngineMajorVersionUpgrade   = errors.New("database engine cannot be upgraded to a major version")
	errDBEngineDowngrade             = errors.New("database engine version cannot be downgraded")
	errDuplicatedSchedules           = errors.New("duplicated backup schedules are not allowed")

	//nolint:gochecknoglobals
	operatorEngine = map[everestv1alpha1.EngineType]string{
		everestv1alpha1.DatabaseEnginePXC:        pxcDeploymentName,
		everestv1alpha1.DatabaseEnginePSMDB:      psmdbDeploymentName,
		everestv1alpha1.DatabaseEnginePostgresql: pgDeploymentName,
	}
)

// ErrNameNotRFC1035Compatible when the given fieldName doesn't contain RFC 1035 compatible string.
func ErrNameNotRFC1035Compatible(fieldName string) error {
	return fmt.Errorf(`'%s' is not RFC 1035 compatible. The name should contain only lowercase alphanumeric characters or '-', start with an alphabetic character, end with an alphanumeric character`,
		fieldName,
	)
}

// ErrNameTooLong when the given fieldName is longer than expected.
func ErrNameTooLong(fieldName string) error {
	return fmt.Errorf("'%s' can be at most 22 characters long", fieldName)
}

// ErrCreateStorageNotSupported appears when trying to create a storage of a type that is not supported.
func ErrCreateStorageNotSupported(storageType string) error {
	return fmt.Errorf("creating storage is not implemented for '%s'", storageType)
}

// ErrUpdateStorageNotSupported appears when trying to update a storage of a type that is not supported.
func ErrUpdateStorageNotSupported(storageType string) error {
	return fmt.Errorf("updating storage is not implemented for '%s'", storageType)
}

// ErrInvalidURL when the given fieldName contains invalid URL.
func ErrInvalidURL(fieldName string) error {
	return fmt.Errorf("'%s' is an invalid URL", fieldName)
}

// validates names to be RFC-1035 compatible  https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#rfc-1035-label-names
func validateRFC1035(s, name string) error {
	// We are diverging from the RFC1035 spec in regards to the length of the
	// name because the PXC operator limits the name of the cluster to 22.
	if len(s) > 22 {
		return ErrNameTooLong(name)
	}

	rfc1035Regex := "^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$"
	re := regexp.MustCompile(rfc1035Regex)
	if !re.MatchString(s) {
		return ErrNameNotRFC1035Compatible(name)
	}

	return nil
}

func validateURL(urlStr string) bool {
	_, err := url.ParseRequestURI(urlStr)
	return err == nil
}

func validateStorageAccessByCreate(ctx context.Context, params CreateBackupStorageParams, l *zap.SugaredLogger) error {
	switch params.Type {
	case CreateBackupStorageParamsTypeS3:
		return s3Access(l, params.Url, params.AccessKey, params.SecretKey, params.BucketName, params.Region, pointer.Get(params.VerifyTLS), pointer.Get(params.ForcePathStyle))
	case CreateBackupStorageParamsTypeAzure:
		return azureAccess(ctx, l, params.AccessKey, params.SecretKey, params.BucketName)
	default:
		return ErrCreateStorageNotSupported(string(params.Type))
	}
}

//nolint:funlen
func s3Access(
	l *zap.SugaredLogger,
	endpoint *string,
	accessKey, secretKey, bucketName, region string,
	verifyTLS bool,
	forcePathStyle bool,
) error {
	if config.Debug {
		return nil
	}

	if endpoint != nil && *endpoint == "" {
		endpoint = nil
	}

	c := http.DefaultClient
	c.Transport = &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: !verifyTLS}, //nolint:gosec
	}
	// Create a new session with the provided credentials
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         endpoint,
		Region:           aws.String(region),
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		HTTPClient:       c,
		S3ForcePathStyle: aws.Bool(forcePathStyle),
	})
	if err != nil {
		l.Error(err)
		return errors.New("could not initialize S3 session")
	}

	// Create a new S3 client with the session
	svc := s3.New(sess)

	_, err = svc.HeadBucket(&s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		l.Error(err)
		return errors.New("unable to connect to s3. Check your credentials")
	}

	testKey := "everest-write-test"
	_, err = svc.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Body:   bytes.NewReader([]byte{}),
		Key:    aws.String(testKey),
	})
	if err != nil {
		l.Error(err)
		return errors.New("could not write to S3 bucket")
	}

	_, err = svc.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(testKey),
	})
	if err != nil {
		l.Error(err)
		return errors.New("could not read from S3 bucket")
	}

	_, err = svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(testKey),
	})
	if err != nil {
		l.Error(err)
		return errors.New("could not delete an object from S3 bucket")
	}

	return nil
}

func azureAccess(ctx context.Context, l *zap.SugaredLogger, accountName, accountKey, containerName string) error {
	if config.Debug {
		return nil
	}

	cred, err := azblob.NewSharedKeyCredential(accountName, accountKey)
	if err != nil {
		l.Error(err)
		return errors.New("could not initialize Azure credentials")
	}

	client, err := azblob.NewClientWithSharedKeyCredential(fmt.Sprintf("https://%s.blob.core.windows.net/", url.PathEscape(accountName)), cred, nil)
	if err != nil {
		l.Error(err)
		return errors.New("could not initialize Azure client")
	}

	pager := client.NewListBlobsFlatPager(containerName, nil)
	if pager.More() {
		if _, err := pager.NextPage(ctx); err != nil {
			l.Error(err)
			return errors.New("could not list blobs in Azure container")
		}
	}

	blobName := "everest-test-blob"
	if _, err = client.UploadBuffer(ctx, containerName, blobName, []byte{}, nil); err != nil {
		l.Error(err)
		return errors.New("could not write to Azure container")
	}

	if _, err = client.DownloadBuffer(ctx, containerName, blobName, []byte{}, nil); err != nil {
		l.Error(err)
		return errors.New("could not read from Azure container")
	}

	if _, err = client.DeleteBlob(ctx, containerName, blobName, nil); err != nil {
		l.Error(err)
		return errors.New("could not delete a blob from Azure container")
	}

	return nil
}

func validateAllowedNamespaces(allowedNamespaces, namespaces []string) error {
	for _, allowedNamespace := range allowedNamespaces {
		found := false
		for _, namespace := range namespaces {
			if allowedNamespace == namespace {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("unknown namespace '%s'", allowedNamespace)
		}
	}

	return nil
}

func validateBackupStorageAccess(
	ctx echo.Context,
	sType string,
	url *string,
	bucketName, region, accessKey, secretKey string,
	verifyTLS bool,
	forcePathStyle bool,
	l *zap.SugaredLogger,
) error {
	switch sType {
	case string(BackupStorageTypeS3):
		if region == "" {
			return errors.New("region is required when using S3 storage type")
		}
		if err := s3Access(l, url, accessKey, secretKey, bucketName, region, verifyTLS, forcePathStyle); err != nil {
			return err
		}
	case string(BackupStorageTypeAzure):
		if err := azureAccess(ctx.Request().Context(), l, accessKey, secretKey, bucketName); err != nil {
			return err
		}
	default:
		return ErrUpdateStorageNotSupported(sType)
	}

	return nil
}

func validateUpdateBackupStorageRequest(ctx echo.Context, bs *everestv1alpha1.BackupStorage, secret *corev1.Secret, namespaces []string, l *zap.SugaredLogger) (*UpdateBackupStorageParams, error) {
	var params UpdateBackupStorageParams
	if err := ctx.Bind(&params); err != nil {
		return nil, err
	}

	url := &bs.Spec.EndpointURL
	if params.Url != nil {
		if ok := validateURL(*params.Url); !ok {
			err := ErrInvalidURL("url")
			return nil, err
		}
		url = params.Url
	}

	if params.BucketName != nil {
		if err := validateBucketName(*params.BucketName); err != nil {
			return nil, err
		}
	}

	if params.AllowedNamespaces != nil {
		if err := validateAllowedNamespaces(*params.AllowedNamespaces, namespaces); err != nil {
			return nil, err
		}
	}

	accessKey := string(secret.Data["AWS_ACCESS_KEY_ID"])
	if params.AccessKey != nil {
		accessKey = *params.AccessKey
	}
	secretKey := string(secret.Data["AWS_SECRET_ACCESS_KEY"])
	if params.SecretKey != nil {
		secretKey = *params.SecretKey
	}

	bucketName := bs.Spec.Bucket
	if params.BucketName != nil {
		bucketName = *params.BucketName
	}

	region := bs.Spec.Region
	if params.Region != nil {
		region = *params.Region
	}

	err := validateBackupStorageAccess(ctx, string(bs.Spec.Type), url, bucketName, region, accessKey, secretKey, pointer.Get(params.VerifyTLS), pointer.Get(params.ForcePathStyle), l)
	if err != nil {
		return nil, err
	}

	return &params, nil
}

func validateCreateBackupStorageRequest(ctx echo.Context, namespaces []string, l *zap.SugaredLogger) (*CreateBackupStorageParams, error) {
	var params CreateBackupStorageParams
	if err := ctx.Bind(&params); err != nil {
		return nil, err
	}

	if err := validateRFC1035(params.Name, "name"); err != nil {
		return nil, err
	}

	if err := validateBucketName(params.BucketName); err != nil {
		return nil, err
	}

	if params.Url != nil {
		if ok := validateURL(*params.Url); !ok {
			err := ErrInvalidURL("url")
			return nil, err
		}
	}

	if params.Type == CreateBackupStorageParamsTypeS3 {
		if params.Region == "" {
			return nil, errors.New("region is required when using S3 storage type")
		}
	}

	if err := validateAllowedNamespaces(params.AllowedNamespaces, namespaces); err != nil {
		return nil, err
	}

	// check data access
	if err := validateStorageAccessByCreate(ctx.Request().Context(), params, l); err != nil {
		l.Error(err)
		return nil, err
	}

	return &params, nil
}

func validateCreateMonitoringInstanceRequest(ctx echo.Context) (*CreateMonitoringInstanceJSONRequestBody, error) {
	var params CreateMonitoringInstanceJSONRequestBody
	if err := ctx.Bind(&params); err != nil {
		return nil, err
	}

	if err := validateRFC1035(params.Name, "name"); err != nil {
		return nil, err
	}

	if ok := validateURL(params.Url); !ok {
		return nil, ErrInvalidURL("url")
	}

	if params.AllowedNamespaces == nil || len(*params.AllowedNamespaces) == 0 {
		return nil, errors.New("allowedNamespaces is required")
	}

	switch params.Type {
	case MonitoringInstanceCreateParamsTypePmm:
		if params.Pmm == nil {
			return nil, fmt.Errorf("pmm key is required for type %s", params.Type)
		}

		if params.Pmm.ApiKey == "" && (params.Pmm.User == "" || params.Pmm.Password == "") {
			return nil, errors.New("pmm.apiKey or pmm.user with pmm.password fields are required")
		}
	default:
		return nil, fmt.Errorf("monitoring type %s is not supported", params.Type)
	}

	return &params, nil
}

func validateUpdateMonitoringInstanceRequest(ctx echo.Context) (*UpdateMonitoringInstanceJSONRequestBody, error) {
	var params UpdateMonitoringInstanceJSONRequestBody
	if err := ctx.Bind(&params); err != nil {
		return nil, err
	}

	if params.Url != "" {
		if ok := validateURL(params.Url); !ok {
			err := ErrInvalidURL("url")
			return nil, err
		}
	}

	if params.AllowedNamespaces != nil && len(*params.AllowedNamespaces) == 0 {
		return nil, errors.New("allowedNamespaces cannot be empty")
	}

	if err := validateUpdateMonitoringInstanceType(params); err != nil {
		return nil, err
	}

	if params.Pmm != nil && params.Pmm.ApiKey == "" && params.Pmm.User == "" && params.Pmm.Password == "" {
		return nil, errors.New("one of pmm.apiKey, pmm.user or pmm.password fields is required")
	}

	return &params, nil
}

func validateUpdateMonitoringInstanceType(params UpdateMonitoringInstanceJSONRequestBody) error {
	switch params.Type {
	case "":
		return nil
	case MonitoringInstanceUpdateParamsTypePmm:
		if params.Pmm == nil {
			return fmt.Errorf("pmm key is required for type %s", params.Type)
		}
	default:
		return errors.New("this monitoring type is not supported")
	}

	return nil
}

func validateCreateDatabaseClusterRequest(dbc DatabaseCluster) error {
	name, _, err := nameFromDatabaseCluster(dbc)
	if err != nil {
		return err
	}

	return validateRFC1035(name, "metadata.name")
}

func nameFromDatabaseCluster(dbc DatabaseCluster) (string, string, error) {
	if dbc.Metadata == nil {
		return "", "", errDBCEmptyMetadata
	}

	md := *dbc.Metadata
	name, ok := md["name"]
	if !ok {
		return "", "", errDBCNameEmpty
	}

	strName, ok := name.(string)
	if !ok {
		return "", "", errDBCNameWrongFormat
	}

	md = *dbc.Metadata
	ns, ok := md["namespace"]
	if !ok {
		return "", "", errDBCNamespaceEmpty
	}

	strNS, ok := ns.(string)
	if !ok {
		return "", "", errDBCNamespaceWrongFormat
	}

	return strName, strNS, nil
}

func (e *EverestServer) validateDatabaseClusterCR(ctx echo.Context, namespace string, databaseCluster *DatabaseCluster) error { //nolint:cyclop
	if err := validateCreateDatabaseClusterRequest(*databaseCluster); err != nil {
		return err
	}

	engineName, ok := operatorEngine[everestv1alpha1.EngineType(databaseCluster.Spec.Engine.Type)]
	if !ok {
		return errors.New("unsupported database engine")
	}
	engine, err := e.kubeClient.GetDatabaseEngine(ctx.Request().Context(), namespace, engineName)
	if err != nil {
		return err
	}
	if err := validateVersion(databaseCluster.Spec.Engine.Version, engine); err != nil {
		return err
	}
	if databaseCluster.Spec != nil && databaseCluster.Spec.Monitoring != nil && databaseCluster.Spec.Monitoring.MonitoringConfigName != nil {
		if _, err := e.validateMonitoringConfigAccess(context.Background(), namespace, *databaseCluster.Spec.Monitoring.MonitoringConfigName); err != nil {
			return err
		}
	}
	if databaseCluster.Spec.Proxy != nil && databaseCluster.Spec.Proxy.Type != nil {
		if err := validateProxy(databaseCluster.Spec.Engine.Type, string(*databaseCluster.Spec.Proxy.Type)); err != nil {
			return err
		}
	}
	if err := validateBackupSpec(databaseCluster); err != nil {
		return err
	}

	if err = validateBackupStoragesFor(ctx.Request().Context(), namespace, databaseCluster, e.validateBackupStoragesAccess); err != nil {
		return err
	}

	if databaseCluster.Spec.DataSource != nil {
		if err := validateDBDataSource(databaseCluster); err != nil {
			return err
		}
	}

	if databaseCluster.Spec.Engine.Type == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePostgresql) {
		if err = validatePGReposForAPIDB(ctx.Request().Context(), databaseCluster, e.kubeClient.ListDatabaseClusterBackups); err != nil {
			return err
		}
	}

	return validateResourceLimits(databaseCluster)
}

func validateBackupStoragesFor( //nolint:cyclop
	ctx context.Context,
	namespace string,
	databaseCluster *DatabaseCluster,
	validateBackupStorageAccessFunc func(context.Context, string, string) (*everestv1alpha1.BackupStorage, error),
) error {
	if databaseCluster.Spec.Backup == nil {
		return nil
	}
	storages := make(map[string]bool)
	if databaseCluster.Spec.Backup.Schedules != nil {
		for _, schedule := range *databaseCluster.Spec.Backup.Schedules {
			_, err := validateBackupStorageAccessFunc(ctx, namespace, schedule.BackupStorageName)
			if err != nil {
				return err
			}
			storages[schedule.BackupStorageName] = true
		}
	}

	if databaseCluster.Spec.Engine.Type == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePSMDB) {
		// attempt to configure more than one storage for psmdb
		if len(storages) > 1 {
			return errPSMDBMultipleStorages
		}
		// attempt to use a storage other than the active one
		if databaseCluster.Status != nil {
			activeStorage := databaseCluster.Status.ActiveStorage
			for name := range storages {
				if activeStorage != nil && *activeStorage != "" && name != *activeStorage {
					return errPSMDBViolateActiveStorage
				}
			}
		}
	}

	if databaseCluster.Spec.Backup.Pitr == nil || !databaseCluster.Spec.Backup.Pitr.Enabled {
		return nil
	}

	if databaseCluster.Spec.Engine.Type == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePXC) {
		if databaseCluster.Spec.Backup.Pitr.BackupStorageName == nil || *databaseCluster.Spec.Backup.Pitr.BackupStorageName == "" {
			return errPitrNoBackupStorageName
		}
		storage, err := validateBackupStorageAccessFunc(ctx, namespace, *databaseCluster.Spec.Backup.Pitr.BackupStorageName)
		if err != nil {
			return err
		}
		// pxc only supports s3 for pitr
		if storage.Spec.Type != everestv1alpha1.BackupStorageTypeS3 {
			return errPXCPitrS3Only
		}
	}

	return nil
}

func (e *EverestServer) validateBackupStoragesAccess(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error) {
	bs, err := e.kubeClient.GetBackupStorage(ctx, e.kubeClient.Namespace(), name)
	if k8serrors.IsNotFound(err) {
		return nil, fmt.Errorf("backup storage %s does not exist", name)
	}
	if err != nil {
		return nil, fmt.Errorf("could not validate backup storage %s", name)
	}

	for _, ns := range bs.Spec.AllowedNamespaces {
		if ns == namespace {
			return bs, nil
		}
	}
	return nil, fmt.Errorf("backup storage %s is not allowed for namespace %s", name, namespace)
}

func (e *EverestServer) validateMonitoringConfigAccess(ctx context.Context, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	mc, err := e.kubeClient.GetMonitoringConfig(ctx, MonitoringNamespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, fmt.Errorf("monitoring config %s does not exist", name)
		}
		return nil, fmt.Errorf("failed getting monitoring config %s", name)
	}

	for _, ns := range mc.Spec.AllowedNamespaces {
		if ns == namespace {
			return mc, nil
		}
	}
	return nil, fmt.Errorf("monitoring config %s is not allowed for namespace %s", name, namespace)
}

func validateVersion(version *string, engine *everestv1alpha1.DatabaseEngine) error {
	if version != nil {
		if len(engine.Spec.AllowedVersions) > 0 {
			if !containsVersion(*version, engine.Spec.AllowedVersions) {
				return fmt.Errorf("using %s version for %s is not allowed", *version, engine.Spec.Type)
			}
			return nil
		}
		if _, ok := engine.Status.AvailableVersions.Engine[*version]; !ok {
			return fmt.Errorf("%s is not in available versions list", *version)
		}
	}
	return nil
}

func containsVersion(version string, versions []string) bool {
	if version == "" {
		return true
	}
	for _, allowedVersion := range versions {
		if version == allowedVersion {
			return true
		}
	}
	return false
}

func validateProxy(engineType DatabaseClusterSpecEngineType, proxyType string) error {
	if engineType == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePXC) {
		if proxyType != string(everestv1alpha1.ProxyTypeProxySQL) && proxyType != string(everestv1alpha1.ProxyTypeHAProxy) {
			return errUnsupportedPXCProxy
		}
	}

	if engineType == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePostgresql) && proxyType != string(everestv1alpha1.ProxyTypePGBouncer) {
		return errUnsupportedPGProxy
	}
	if engineType == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePSMDB) && proxyType != string(everestv1alpha1.ProxyTypeMongos) {
		return errUnsupportedPSMDBProxy
	}
	return nil
}

func validateBackupSpec(cluster *DatabaseCluster) error {
	if cluster.Spec.Backup == nil {
		return nil
	}
	if !cluster.Spec.Backup.Enabled {
		return nil
	}
	if cluster.Spec.Backup.Schedules == nil {
		return errNoSchedules
	}

	if err := validatePitrSpec(cluster); err != nil {
		return err
	}

	for _, schedule := range *cluster.Spec.Backup.Schedules {
		if schedule.Name == "" {
			return errNoNameInSchedule
		}
		if schedule.Enabled && schedule.BackupStorageName == "" {
			return errScheduleNoBackupStorageName
		}
	}
	return checkDuplicateSchedules(*cluster.Spec.Backup.Schedules)
}

type apiSchedule []struct {
	BackupStorageName string `json:"backupStorageName"`
	Enabled           bool   `json:"enabled"`
	Name              string `json:"name"`
	RetentionCopies   *int32 `json:"retentionCopies,omitempty"`
	Schedule          string `json:"schedule"`
}

func checkDuplicateSchedules(schedules apiSchedule) error {
	m := make(map[string]struct{})
	for _, s := range schedules {
		key := s.Schedule
		if _, ok := m[key]; ok {
			return errDuplicatedSchedules
		}
		m[key] = struct{}{}
	}
	return nil
}

func validatePitrSpec(cluster *DatabaseCluster) error {
	if cluster.Spec.Backup.Pitr == nil || !cluster.Spec.Backup.Pitr.Enabled {
		return nil
	}

	if cluster.Spec.Engine.Type == DatabaseClusterSpecEngineType(everestv1alpha1.DatabaseEnginePXC) &&
		(cluster.Spec.Backup.Pitr.BackupStorageName == nil || *cluster.Spec.Backup.Pitr.BackupStorageName == "") {
		return errPitrNoBackupStorageName
	}

	if cluster.Spec.Backup.Pitr.UploadIntervalSec != nil && *cluster.Spec.Backup.Pitr.UploadIntervalSec <= 0 {
		return errPitrUploadInterval
	}

	return nil
}

func validateResourceLimits(cluster *DatabaseCluster) error {
	if err := ensureNonEmptyResources(cluster); err != nil {
		return err
	}
	if err := validateCPU(cluster); err != nil {
		return err
	}
	if err := validateMemory(cluster); err != nil {
		return err
	}
	return validateStorageSize(cluster)
}

func validateDBDataSource(db *DatabaseCluster) error {
	bytes, err := json.Marshal(db.Spec.DataSource)
	if err != nil {
		return errIncorrectDataSourceStruct
	}
	return validateCommonDataSourceStruct(bytes)
}

func validateRestoreDataSource(restore *DatabaseClusterRestore) error {
	bytes, err := json.Marshal(restore.Spec.DataSource)
	if err != nil {
		return errIncorrectDataSourceStruct
	}
	return validateCommonDataSourceStruct(bytes)
}

func validateCommonDataSourceStruct(data []byte) error {
	// marshal and unmarshal to use the same validation func to validate DataSource for both db and restore
	ds := &dataSourceStruct{}
	err := json.Unmarshal(data, ds)
	if err != nil {
		return errIncorrectDataSourceStruct
	}
	return validateDataSource(*ds)
}

func validateDataSource(dataSource dataSourceStruct) error {
	if (dataSource.DbClusterBackupName == nil && dataSource.BackupSource == nil) ||
		(dataSource.DbClusterBackupName != nil && *dataSource.DbClusterBackupName != "" && dataSource.BackupSource != nil) {
		return errDataSourceConfig
	}

	if dataSource.BackupSource != nil {
		if dataSource.BackupSource.BackupStorageName == "" {
			return errDataSourceNoBackupStorageName
		}

		if dataSource.BackupSource.Path == "" {
			return errDataSourceNoPath
		}
	}

	if dataSource.Pitr != nil { //nolint:nestif
		if dataSource.Pitr.Type == nil || *dataSource.Pitr.Type == string(DatabaseClusterSpecDataSourcePitrTypeDate) {
			if dataSource.Pitr.Date == nil {
				return errDataSourceNoPitrDateSpecified
			}

			if _, err := time.Parse(dateFormat, *dataSource.Pitr.Date); err != nil {
				return errDataSourceWrongDateFormat
			}
		} else {
			return errUnsupportedPitrType
		}
	}
	return nil
}

func ensureNonEmptyResources(cluster *DatabaseCluster) error {
	if cluster.Spec.Engine.Resources == nil {
		return errNoResourceDefined
	}
	if cluster.Spec.Engine.Resources.Cpu == nil {
		return errNotEnoughCPU
	}
	if cluster.Spec.Engine.Resources.Memory == nil {
		return errNotEnoughMemory
	}
	return nil
}

func validateCPU(cluster *DatabaseCluster) error {
	cpuStr, err := cluster.Spec.Engine.Resources.Cpu.AsDatabaseClusterSpecEngineResourcesCpu1()
	if err == nil {
		cpu, err := resource.ParseQuantity(cpuStr)
		if err != nil {
			return err
		}
		if cpu.Cmp(minCPUQuantity) == -1 {
			return errNotEnoughCPU
		}
	}
	_, err = cluster.Spec.Engine.Resources.Cpu.AsDatabaseClusterSpecEngineResourcesCpu0()
	if err == nil {
		return errInt64NotSupported
	}
	return nil
}

func validateMemory(cluster *DatabaseCluster) error {
	_, err := cluster.Spec.Engine.Resources.Memory.AsDatabaseClusterSpecEngineResourcesMemory0()
	if err == nil {
		return errInt64NotSupported
	}
	memStr, err := cluster.Spec.Engine.Resources.Memory.AsDatabaseClusterSpecEngineResourcesMemory1()
	if err == nil {
		mem, err := resource.ParseQuantity(memStr)
		if err != nil {
			return err
		}
		if mem.Cmp(minMemQuantity) == -1 {
			return errNotEnoughMemory
		}
	}
	return nil
}

func validateStorageSize(cluster *DatabaseCluster) error {
	_, err := cluster.Spec.Engine.Storage.Size.AsDatabaseClusterSpecEngineStorageSize0()
	if err == nil {
		return errInt64NotSupported
	}
	sizeStr, err := cluster.Spec.Engine.Storage.Size.AsDatabaseClusterSpecEngineStorageSize1()

	if err == nil {
		size, err := resource.ParseQuantity(sizeStr)
		if err != nil {
			return err
		}
		if size.Cmp(minStorageQuantity) == -1 {
			return errNotEnoughDiskSize
		}
	}
	return nil
}

// validateDBEngineVersionUpgrade validates if upgrade of DBEngine from `oldVersion` to `newVersion` is allowed.
func validateDBEngineVersionUpgrade(newVersion, oldVersion string) error {
	// Ensure a "v" prefix so that it is a valid semver.
	if !strings.HasPrefix(newVersion, "v") {
		newVersion = "v" + newVersion
	}
	if !strings.HasPrefix(oldVersion, "v") {
		oldVersion = "v" + oldVersion
	}

	// Check semver validity.
	if !semver.IsValid(newVersion) {
		return errInvalidVersion
	}

	// We will not allow major upgrades.
	// Major upgrades are handled differently for different operators, so for now we simply won't allow it.
	// For example:
	// - PXC operator allows major upgrades.
	// - PSMDB operator allows major upgrades, but we need to handle FCV.
	// - PG operator does not allow major upgrades.
	if semver.Major(oldVersion) != semver.Major(newVersion) {
		return errDBEngineMajorVersionUpgrade
	}
	// We will not allow downgrades.
	if semver.Compare(newVersion, oldVersion) < 0 {
		return errDBEngineDowngrade
	}
	return nil
}

func validateDatabaseClusterOnUpdate(dbc *DatabaseCluster, oldDB *everestv1alpha1.DatabaseCluster) error {
	newVersion := pointer.Get(dbc.Spec.Engine.Version)
	oldVersion := oldDB.Spec.Engine.Version
	if newVersion != "" && newVersion != oldVersion {
		if err := validateDBEngineVersionUpgrade(newVersion, oldVersion); err != nil {
			return err
		}
	}
	if *dbc.Spec.Engine.Replicas < oldDB.Spec.Engine.Replicas && *dbc.Spec.Engine.Replicas == 1 {
		// XXX: We can scale down multiple node clusters to a single node but we need to set
		// `allowUnsafeConfigurations` to `true`. Having this configuration is not recommended
		// and makes a database cluster unsafe. Once allowUnsafeConfigurations set to true you
		// can't set it to false for all operators and psmdb operator does not support it.
		//
		// Once it is supported by all operators we can revert this.
		return fmt.Errorf("cannot scale down %d node cluster to 1. The operation is not supported", oldDB.Spec.Engine.Replicas)
	}
	return nil
}

func (e *EverestServer) validateDatabaseClusterBackup(ctx context.Context, namespace string, backup *DatabaseClusterBackup) error {
	if backup == nil {
		return errors.New("backup cannot be empty")
	}
	if backup.Spec == nil {
		return errors.New(".spec cannot be empty")
	}
	b := &everestv1alpha1.DatabaseClusterBackup{}
	data, err := json.Marshal(backup)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, b); err != nil {
		return err
	}
	if b.Spec.BackupStorageName == "" {
		return errors.New(".spec.backupStorageName cannot be empty")
	}
	if b.Spec.DBClusterName == "" {
		return errors.New(".spec.dbClusterName cannot be empty")
	}
	db, err := e.kubeClient.GetDatabaseCluster(ctx, namespace, b.Spec.DBClusterName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("database cluster %s does not exist", b.Spec.DBClusterName)
		}
		return err
	}

	_, err = e.validateBackupStoragesAccess(ctx, namespace, b.Spec.BackupStorageName)
	if err != nil {
		return err
	}

	if err = validatePGReposForBackup(ctx, *db, e.kubeClient, *b); err != nil {
		return err
	}

	if db.Spec.Engine.Type == everestv1alpha1.DatabaseEnginePSMDB {
		if db.Status.ActiveStorage != "" && db.Status.ActiveStorage != b.Spec.BackupStorageName {
			return errPSMDBViolateActiveStorage
		}
	}
	return nil
}

func validatePGReposForBackup(ctx context.Context, db everestv1alpha1.DatabaseCluster, kubeClient *kubernetes.Kubernetes, newBackup everestv1alpha1.DatabaseClusterBackup) error {
	if db.Spec.Engine.Type != everestv1alpha1.DatabaseEnginePostgresql {
		return nil
	}

	// convert between k8s and api structure
	str, err := json.Marshal(db)
	if err != nil {
		return err
	}
	apiDB := &DatabaseCluster{}
	if err := json.Unmarshal(str, apiDB); err != nil {
		return err
	}

	// put the backup that being validated to the list of all backups to calculate if the limitations are respected
	getBackupsFunc := func(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
		list, err := kubeClient.ListDatabaseClusterBackups(ctx, namespace, options)
		if err != nil {
			return nil, err
		}
		list.Items = append(list.Items, newBackup)
		return list, nil
	}

	if err = validatePGReposForAPIDB(ctx, apiDB, getBackupsFunc); err != nil {
		return err
	}
	return nil
}

func validateDatabaseClusterRestore(ctx context.Context, namespace string, restore *DatabaseClusterRestore, kubeClient *kubernetes.Kubernetes) error {
	if restore == nil {
		return errors.New("restore cannot be empty")
	}
	if restore.Spec == nil {
		return errors.New(".spec cannot be empty")
	}
	r := &everestv1alpha1.DatabaseClusterRestore{}
	data, err := json.Marshal(restore)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, r); err != nil {
		return err
	}
	if r.Spec.DataSource.DBClusterBackupName == "" {
		return errors.New(".spec.dataSource.dbClusterBackupName cannot be empty")
	}
	if r.Spec.DBClusterName == "" {
		return errors.New(".spec.dbClusterName cannot be empty")
	}
	_, err = kubeClient.GetDatabaseCluster(ctx, namespace, r.Spec.DBClusterName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("database cluster %s does not exist", r.Spec.DBClusterName)
		}
		return err
	}
	b, err := kubeClient.GetDatabaseClusterBackup(ctx, namespace, r.Spec.DataSource.DBClusterBackupName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("backup %s does not exist", r.Spec.DataSource.DBClusterBackupName)
		}
		return err
	}
	_, err = kubeClient.GetBackupStorage(ctx, kubeClient.Namespace(), b.Spec.BackupStorageName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("backup storage %s does not exist", r.Spec.DataSource.BackupSource.BackupStorageName)
		}
		return err
	}
	if err = validateRestoreDataSource(restore); err != nil {
		return err
	}
	return err
}

type dataSourceStruct struct {
	BackupSource *struct {
		BackupStorageName string `json:"backupStorageName"`
		Path              string `json:"path"`
	} `json:"backupSource,omitempty"`
	DbClusterBackupName *string `json:"dbClusterBackupName,omitempty"` //nolint:stylecheck
	Pitr                *struct {
		Date *string `json:"date,omitempty"`
		Type *string `json:"type,omitempty"`
	} `json:"pitr,omitempty"`
}

func validatePGReposForAPIDB(ctx context.Context, dbc *DatabaseCluster, getBackupsFunc func(context.Context, string, metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error)) error {
	bs := make(map[string]bool)
	var reposCount int
	if dbc.Spec != nil && dbc.Spec.Backup != nil && dbc.Spec.Backup.Schedules != nil {
		for _, shed := range *dbc.Spec.Backup.Schedules {
			bs[shed.BackupStorageName] = true
		}
		// each schedule counts as a separate repo regardless of the BS used in it
		reposCount = len(*dbc.Spec.Backup.Schedules)
		// first check if there are too many schedules. Each schedule is configured in a separate repo.
		if reposCount > pgReposLimit {
			return errTooManyPGSchedules
		}
	}

	dbcName, dbcNamespace, err := nameFromDatabaseCluster(*dbc)
	if err != nil {
		return err
	}

	backups, err := getBackupsFunc(ctx, dbcNamespace, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("clusterName=%s", dbcName),
	})
	if err != nil {
		return err
	}

	for _, backup := range backups.Items {
		// repos count is increased only if there wasn't such a BS used
		if _, ok := bs[backup.Spec.BackupStorageName]; !ok {
			bs[backup.Spec.BackupStorageName] = true
			reposCount++
		}
	}

	// second check if there are too many repos used.
	if reposCount > pgReposLimit {
		return errTooManyPGStorages
	}

	return nil
}

func validateMetadata(metadata *map[string]interface{}) error {
	if metadata == nil {
		return errNoMetadata
	}
	m := *metadata
	if _, err := strconv.ParseUint(fmt.Sprint(m["resourceVersion"]), 10, 64); err != nil {
		return errInvalidResourceVersion
	}
	return nil
}

func validateBucketName(s string) error {
	// sanitize: accept only lowercase letters, numbers, dots and hyphens.
	// can be applied to both s3 bucket name and azure container name.
	bucketRegex := `^[a-z0-9\.\-]{3,63}$`
	re := regexp.MustCompile(bucketRegex)
	if !re.MatchString(s) {
		return errInvalidBucketName
	}

	return nil
}
