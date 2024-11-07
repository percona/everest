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

import { FormGroup, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useCallback, useEffect, useMemo } from 'react';
import { lt, valid } from 'semver';
import { DbType } from '@percona/types';
import { AutoCompleteInput, SwitchInput, TextInput } from '@percona/ui-lib';
import { dbTypeToDbEngine } from '@percona/utils';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import { useFormContext } from 'react-hook-form';
import { DbEngineToolStatus } from 'shared-types/dbEngines.types';
import { DB_WIZARD_DEFAULTS } from '../../../database-form.constants.ts';
import { StepProps } from '../../../database-form.types.ts';
import { DbWizardFormFields } from 'consts.ts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { DEFAULT_NODES } from './first-step.constants.ts';
import { Messages } from './first-step.messages.ts';
import { filterAvailableDbVersionsForDbEngineEdition } from 'components/cluster-form/db-version/utils.ts';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import {
  NODES_DEFAULT_SIZES,
  PROXIES_DEFAULT_SIZES,
  ResourceSize,
} from 'components/cluster-form';
import { DbVersion } from 'components/cluster-form/db-version';
import { useDBEnginesForDbEngineTypes } from 'hooks/index.ts';
import { useDatabasePageDefaultValues } from 'pages/database-form/useDatabaseFormDefaultValues.ts';

export const FirstStep = ({ loadingDefaultsForEdition }: StepProps) => {
  const mode = useDatabasePageMode();

  const {
    defaultValues: { [DbWizardFormFields.dbVersion]: defaultDbVersion },
  } = useDatabasePageDefaultValues(mode);
  const { watch, setValue, getFieldState, resetField, trigger } =
    useFormContext();

  const { data: clusterInfo, isFetching: clusterInfoFetching } =
    useKubernetesClusterInfo(['wizard-k8-info']);

  const dbType: DbType = watch(DbWizardFormFields.dbType);
  const dbVersion: DbType = watch(DbWizardFormFields.dbVersion);
  const dbNamespace = watch(DbWizardFormFields.k8sNamespace);

  const [dbEnginesFoDbEngineTypes, dbEnginesFoDbEngineTypesFetching] =
    useDBEnginesForDbEngineTypes(dbTypeToDbEngine(dbType));

  const dbEnginesDataWithNamespaces = useMemo(() => {
    return !dbEnginesFoDbEngineTypesFetching
      ? dbEnginesFoDbEngineTypes.map((item) => item?.dbEngines).flat(1)
      : [];
  }, [dbEnginesFoDbEngineTypesFetching, dbEnginesFoDbEngineTypes]);

  const dbEngineData = useMemo(() => {
    const dbEnginesArray = dbEnginesDataWithNamespaces
      .filter((item) => item.namespace === dbNamespace)
      .map((item) => item.dbEngine);
    const dbEngine = dbEnginesArray ? dbEnginesArray[0] : undefined;
    if (mode === 'edit' && dbEngine) {
      const validVersions = filterAvailableDbVersionsForDbEngineEdition(
        dbEngine,
        defaultDbVersion
      );
      return {
        ...dbEngine,
        availableVersions: {
          ...dbEngine.availableVersions,
          engine: validVersions,
        },
      };
    }
    return dbEngine;
  }, [dbEnginesDataWithNamespaces, dbNamespace, mode, defaultDbVersion]);

  const notSupportedMongoOperatorVersionForSharding =
    dbType === DbType.Mongo &&
    !!valid(dbEngineData?.operatorVersion) &&
    lt(dbEngineData?.operatorVersion || '', '1.17.0');

  const disableSharding =
    mode !== 'new' || notSupportedMongoOperatorVersionForSharding;

  // setting the storage class default value
  useEffect(() => {
    const { isTouched: storageClassTouched } = getFieldState(
      DbWizardFormFields.storageClass
    );

    if (
      !storageClassTouched &&
      mode === 'new' &&
      clusterInfo?.storageClassNames &&
      clusterInfo.storageClassNames.length > 0
    ) {
      setValue(
        DbWizardFormFields.storageClass,
        clusterInfo?.storageClassNames[0]
      );
    }
  }, [clusterInfo]);

  const { canCreate, isFetching } =
    useNamespacePermissionsForResource('database-clusters');

  const filteredNamespaces = canCreate.filter((namespace) =>
    dbEnginesDataWithNamespaces?.find(
      (dbEngine) => dbEngine.namespace === namespace
    )
  );

  // setting the dbnamespace default value
  useEffect(() => {
    const { isTouched: k8sNamespaceTouched } = getFieldState(
      DbWizardFormFields.k8sNamespace
    );
    if (
      !k8sNamespaceTouched &&
      mode === 'new' &&
      filteredNamespaces.length > 0 &&
      !isFetching
    ) {
      setValue(DbWizardFormFields.k8sNamespace, filteredNamespaces[0]);
      trigger(DbWizardFormFields.k8sNamespace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isFetching, filteredNamespaces.length]);

  // setting the dvVersion default value
  useEffect(() => {
    const { isDirty: dbVersionDirty } = getFieldState(
      DbWizardFormFields.dbVersion
    );

    // Safety check
    if (
      dbVersionDirty ||
      !dbEngineData ||
      !dbEngineData.availableVersions.engine.length
    ) {
      return;
    }
    if (
      ((mode === 'edit' || mode === 'restoreFromBackup') && !dbVersion) ||
      mode === 'new'
    ) {
      const recommendedVersion = dbEngineData.availableVersions.engine
        .slice()
        .reverse()
        .find((version) => version.status === DbEngineToolStatus.RECOMMENDED);

      setValue(
        DbWizardFormFields.dbVersion,
        recommendedVersion
          ? recommendedVersion.version
          : dbEngineData.availableVersions.engine[0].version
      );
    }
  }, [dbVersion, dbEngineData, getFieldState, mode, setValue]);

  const onNamespaceChange = () => {
    setValue(
      DbWizardFormFields.monitoringInstance,
      DB_WIZARD_DEFAULTS.monitoringInstance
    );
    setValue(DbWizardFormFields.monitoring, DB_WIZARD_DEFAULTS.monitoring);
    setValue(DbWizardFormFields.schedules, []);
  };

  const setDefaultsForDbType = useCallback((dbType: DbType) => {
    setValue(DbWizardFormFields.numberOfNodes, DEFAULT_NODES[dbType]);
    setValue(DbWizardFormFields.customNrOfNodes, DEFAULT_NODES[dbType]);
    setValue(DbWizardFormFields.numberOfProxies, DEFAULT_NODES[dbType]);
    setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.small);
    setValue(DbWizardFormFields.resourceSizePerProxy, ResourceSize.small);
    setValue(DbWizardFormFields.cpu, NODES_DEFAULT_SIZES[dbType].small.cpu);
    setValue(
      DbWizardFormFields.proxyCpu,
      PROXIES_DEFAULT_SIZES[dbType].small.cpu
    );
    setValue(
      DbWizardFormFields.memory,
      NODES_DEFAULT_SIZES[dbType].small.memory
    );
    setValue(
      DbWizardFormFields.proxyMemory,
      PROXIES_DEFAULT_SIZES[dbType].small.memory
    );
    setValue(DbWizardFormFields.disk, NODES_DEFAULT_SIZES[dbType].small.disk);
    setValue(DbWizardFormFields.shardNr, DB_WIZARD_DEFAULTS.shardNr);
    setValue(
      DbWizardFormFields.shardConfigServers,
      DB_WIZARD_DEFAULTS.shardConfigServers
    );

    resetField(DbWizardFormFields.numberOfProxies, {
      keepTouched: false,
    });
    resetField(DbWizardFormFields.shardNr, {
      keepError: false,
    });
    resetField(DbWizardFormFields.shardConfigServers, {
      keepError: false,
    });
    resetField(DbWizardFormFields.sharding, {
      keepError: false,
    });
  }, []);

  useEffect(() => {
    setDefaultsForDbType(dbType);
  }, [dbType, setDefaultsForDbType]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
      <FormGroup sx={{ mt: 3 }}>
        <AutoCompleteInput
          labelProps={{
            sx: { mt: 1 },
          }}
          name={DbWizardFormFields.k8sNamespace}
          label={Messages.labels.k8sNamespace}
          loading={isFetching}
          options={filteredNamespaces}
          disabled={
            mode === 'edit' ||
            mode === 'restoreFromBackup' ||
            loadingDefaultsForEdition
          }
          onChange={onNamespaceChange}
          autoCompleteProps={{
            disableClearable: true,
            isOptionEqualToValue: (option, value) => option === value,
          }}
        />

        <TextInput
          name={DbWizardFormFields.dbName}
          label={Messages.labels.dbName}
          textFieldProps={{
            placeholder: Messages.placeholders.dbName,
            disabled: mode === 'edit' || loadingDefaultsForEdition,
          }}
        />
        <DbVersion
          selectInputProps={{
            selectFieldProps: { disabled: mode === 'restoreFromBackup' },
          }}
          availableVersions={dbEngineData?.availableVersions.engine}
        />
        <AutoCompleteInput
          name={DbWizardFormFields.storageClass}
          label={Messages.labels.storageClass}
          loading={clusterInfoFetching}
          options={clusterInfo?.storageClassNames || []}
          autoCompleteProps={{
            disableClearable: true,
            disabled: mode === 'edit' || loadingDefaultsForEdition,
          }}
        />
        {dbType === DbType.Mongo && (
          <>
            <Typography variant="sectionHeading" sx={{ mt: 4 }}>
              Shards
            </Typography>
            <Stack spacing={1} direction="row" alignItems="center">
              <SwitchInput
                label={Messages.labels.shardedCluster}
                name={DbWizardFormFields.sharding}
                switchFieldProps={{
                  disabled: disableSharding,
                  onChange: (e) => {
                    if (!e.target.checked) {
                      resetField(DbWizardFormFields.shardNr, {
                        keepError: false,
                      });
                      resetField(DbWizardFormFields.shardConfigServers, {
                        keepError: false,
                      });
                    }
                  },
                }}
              />
              {notSupportedMongoOperatorVersionForSharding &&
                mode !== 'edit' && (
                  <Tooltip
                    title={Messages.disableShardingTooltip}
                    arrow
                    placement="right"
                  >
                    <InfoOutlinedIcon color="primary" />
                  </Tooltip>
                )}
              {mode === 'edit' && (
                <Tooltip
                  title={Messages.disableShardingInEditMode}
                  arrow
                  placement="right"
                >
                  <InfoOutlinedIcon color="primary" />
                </Tooltip>
              )}
            </Stack>
          </>
        )}
      </FormGroup>
    </>
  );
};
