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

import { FormGroup, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useCallback, useEffect, useState } from 'react';
import { lt, valid } from 'semver';
import { DbEngineType, DbType } from '@percona/types';
import {
  AutoCompleteInput,
  DbToggleCard,
  LabeledContent,
  SwitchInput,
  TextInput,
  ToggleButtonGroupInput,
} from '@percona/ui-lib';
import { dbEngineToDbType, dbTypeToDbEngine } from '@percona/utils';
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
import { useDatabasePageDefaultValues } from '../../../useDatabaseFormDefaultValues.ts';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import { useDBEnginesForNamespaces } from 'hooks/api/namespaces/useNamespaces.ts';
import {
  NODES_DEFAULT_SIZES,
  PROXIES_DEFAULT_SIZES,
  ResourceSize,
} from 'components/cluster-form';
import { DbVersion } from 'components/cluster-form/db-version';
import { generateShortUID } from 'utils/generateShortUID';

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

  const dbEnginesForNamespaces = useDBEnginesForNamespaces();
  const dbEnginesFetching = dbEnginesForNamespaces.some(
    (result) => result.isFetching
  );

  const dbEngines =
    dbEnginesForNamespaces.find(
      (dbEngine) => dbEngine.namespace === dbNamespace
    )?.data || [];

  const dbEngine = dbTypeToDbEngine(dbType);

  const [dbEngineData, setDbEngineData] = useState(
    dbEngines.find((engine) => engine.type === dbEngine)
  );

  const notSupportedMongoOperatorVersionForSharding =
    dbType === DbType.Mongo &&
    dbEngineData?.type !== DbEngineType.PXC &&
    !!valid(dbEngineData?.operatorVersion) &&
    lt(dbEngineData?.operatorVersion || '', '1.17.0');

  const disableSharding =
    mode !== 'new' || notSupportedMongoOperatorVersionForSharding;

  const setRandomDbName = useCallback(
    (type: DbType) => {
      setValue(DbWizardFormFields.dbName, `${type}-${generateShortUID()}`, {
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const setDbEngineDataForEngineType = useCallback(() => {
    //TODO 1234 - edit of dbVersion field should be refactored
    const newEngineData = dbEngines.find((engine) => engine.type === dbEngine);

    if (newEngineData && mode === 'edit') {
      const validVersions = filterAvailableDbVersionsForDbEngineEdition(
        newEngineData,
        defaultDbVersion
      );
      newEngineData.availableVersions.engine = validVersions;
    }

    setDbEngineData(newEngineData);
  }, [dbEngine, dbEngines, defaultDbVersion]);

  const updateDbVersions = useCallback(() => {
    const { isDirty: dbVersionDirty } = getFieldState(
      DbWizardFormFields.dbVersion
    );
    setDbEngineDataForEngineType();

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
  }, [
    dbVersion,
    dbEngineData,
    getFieldState,
    mode,
    setDbEngineDataForEngineType,
    setValue,
  ]);

  const onNamespaceChange = () => {
    setValue(
      DbWizardFormFields.monitoringInstance,
      DB_WIZARD_DEFAULTS.monitoringInstance
    );
    setValue(DbWizardFormFields.monitoring, DB_WIZARD_DEFAULTS.monitoring);
    setValue(DbWizardFormFields.schedules, []);
  };

  const setDefaultsForDbType = useCallback((dbType: DbType) => {
    setValue(DbWizardFormFields.dbType, dbType);
    setValue(DbWizardFormFields.numberOfNodes, DEFAULT_NODES[dbType]);
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

  const onDbTypeChange = useCallback(
    (newDbType: DbType) => {
      const { isDirty: isNameDirty } = getFieldState(DbWizardFormFields.dbName);

      resetField(DbWizardFormFields.dbVersion);

      if (!isNameDirty) {
        setRandomDbName(newDbType);
      }

      setDefaultsForDbType(newDbType);
      updateDbVersions();
    },
    [getFieldState, resetField, setRandomDbName, updateDbVersions, setValue]
  );

  useEffect(() => {
    if (mode !== 'new' || dbEngines.length <= 0) {
      return;
    }
    const { isDirty: isNameDirty } = getFieldState(DbWizardFormFields.dbName);
    const defaultDbType = dbEngineToDbType(dbEngines[0].type);

    if (defaultDbType) {
      if (!dbType) {
        setDefaultsForDbType(defaultDbType);
        setRandomDbName(defaultDbType);
      } else if (!dbEngines.find((engine) => engine.type === dbEngine)) {
        setDefaultsForDbType(defaultDbType);
        if (!isNameDirty) {
          setRandomDbName(defaultDbType);
        }
      }
    }
    updateDbVersions();
  }, [
    dbEngines,
    dbType,
    setRandomDbName,
    updateDbVersions,
    setDefaultsForDbType,
  ]);

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

  useEffect(() => {
    if (!dbEngineData) {
      setDbEngineDataForEngineType();
    }
  }, [dbEngineData, setDbEngineDataForEngineType]);

  const { canCreate, isFetching } =
    useNamespacePermissionsForResource('database-clusters');

  const filteredNamespaces = canCreate.filter((namespace) => {
    const dbEnginesForNamespace = dbEnginesForNamespaces.find(
      (dbEngine) => dbEngine.namespace === namespace
    );
    return dbEnginesForNamespace?.data?.length;
  });

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

        <LabeledContent label={Messages.labels.dbType}>
          {dbEnginesFetching || !dbEngines.length ? (
            // This is roughly the height of the buttons
            <Skeleton height={57} variant="rectangular" />
          ) : (
            <ToggleButtonGroupInput
              name={DbWizardFormFields.dbType}
              toggleButtonGroupProps={{
                sx: { mb: 2 },
              }}
            >
              {dbEngines.map(({ type }) => (
                <DbToggleCard
                  key={type}
                  value={dbEngineToDbType(type)}
                  disabled={
                    (mode === 'edit' || mode === 'restoreFromBackup') &&
                    dbType !== dbEngineToDbType(type)
                  }
                  onClick={() => {
                    if (dbEngineToDbType(type) !== dbType) {
                      onDbTypeChange(dbEngineToDbType(type));
                    }
                  }}
                />
              ))}
            </ToggleButtonGroupInput>
          )}
        </LabeledContent>
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
