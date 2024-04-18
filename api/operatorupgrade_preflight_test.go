package api

import (
	"context"
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	versionservice "github.com/percona/everest/pkg/version_service"
)

//nolint:tparallel,paralleltest
func TestOperatorUpgradePreflight(t *testing.T) {
	t.Parallel()
	versionService := versionservice.MockInterface{}
	crVersion := "1.1.1"
	operatorVersion := "1.2.1"
	targetVersion := "1.3.0"
	engine := everestv1alpha1.DatabaseEngine{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-engine",
			Namespace: "test-namespace",
		},
		Spec: everestv1alpha1.DatabaseEngineSpec{
			Type: everestv1alpha1.DatabaseEnginePXC,
		},
		Status: everestv1alpha1.DatabaseEngineStatus{
			OperatorVersion: operatorVersion,
		},
	}
	args := upgradePreflightCheckArgs{
		targetVersion:  targetVersion,
		versionService: &versionService,
	}
	mockDBVersions := []string{"0.5.0", "0.6.0", "0.7.0", "0.8.0"}
	versionService.On(
		"GetSupportedEngineVersions",
		mock.Anything,
		mock.Anything,
		mock.Anything,
	).Return(mockDBVersions, nil)
	ctx := context.Background()
	e := EverestServer{}

	db := everestv1alpha1.DatabaseCluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-db",
			Namespace: "test-namespace",
		},
	}

	t.Run("pending DB Engine upgrade", func(t *testing.T) {
		args.engine = &engine
		db.Spec = everestv1alpha1.DatabaseClusterSpec{
			Engine: everestv1alpha1.Engine{
				Version: "0.4.0",
			},
		}
		dbs := []everestv1alpha1.DatabaseCluster{db}

		result, err := e.runOperatorUpgradePreflightChecks(ctx, dbs, args)
		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, operatorVersion, pointer.Get(result.CurrentVersion))
		assert.Len(t, *result.Databases, 1)
		dbResult := (*result.Databases)[0]
		assert.Equal(t, "test-db", pointer.Get(dbResult.Name))
		assert.Equal(t, UpgradeEngine, pointer.Get(dbResult.PendingTask))
		assert.Equal(t, "Upgrade DB version to 0.5.0", pointer.Get(dbResult.Message))
	})

	t.Run("pending CRVersion update", func(t *testing.T) {
		args.engine = &engine
		db.Spec = everestv1alpha1.DatabaseClusterSpec{
			Engine: everestv1alpha1.Engine{
				Version: "0.5.0",
			},
		}
		db.Status = everestv1alpha1.DatabaseClusterStatus{
			CRVersion:            crVersion,
			RecommendedCRVersion: pointer.To(operatorVersion),
		}
		dbs := []everestv1alpha1.DatabaseCluster{db}

		result, err := e.runOperatorUpgradePreflightChecks(ctx, dbs, args)
		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, operatorVersion, pointer.Get(result.CurrentVersion))
		assert.Len(t, *result.Databases, 1)
		dbResult := (*result.Databases)[0]
		assert.Equal(t, "test-db", pointer.Get(dbResult.Name))
		assert.Equal(t, Restart, pointer.Get(dbResult.PendingTask))
		assert.Equal(t, "Update CRVersion to "+operatorVersion, pointer.Get(dbResult.Message))
	})

	t.Run("ready for upgrade", func(t *testing.T) {
		args.engine = &engine
		db.Spec = everestv1alpha1.DatabaseClusterSpec{
			Engine: everestv1alpha1.Engine{
				Version: "0.5.0",
			},
		}
		db.Status = everestv1alpha1.DatabaseClusterStatus{
			CRVersion: operatorVersion,
		}
		dbs := []everestv1alpha1.DatabaseCluster{db}

		result, err := e.runOperatorUpgradePreflightChecks(ctx, dbs, args)
		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, operatorVersion, pointer.Get(result.CurrentVersion))
		assert.Len(t, *result.Databases, 1)
		dbResult := (*result.Databases)[0]
		assert.Equal(t, "test-db", pointer.Get(dbResult.Name))
		assert.Equal(t, Ready, pointer.Get(dbResult.PendingTask))
	})
}
