// percona-everest-frontend
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

import { FormGroup, MenuItem, Skeleton, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { DbType } from '@percona/types';
import {
  AutoCompleteInput,
  DbToggleCard,
  SelectInput,
  TextInput,
  ToggleButtonGroupInput,
} from '@percona/ui-lib';
import { dbEngineToDbType, dbTypeToDbEngine } from '@percona/utils';
import { useDbEngines } from 'hooks/api/db-engines/useDbEngines';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import { useFormContext } from 'react-hook-form';
import { DbEngineToolStatus } from 'shared-types/dbEngines.types';
import { DbWizardFormFields, StepProps } from '../../database-form.types';
import { NODES_DB_TYPE_MAP } from '../../database-form.constants';
import { useDatabasePageMode } from '../../useDatabasePageMode';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './first-step.messages';
import { DEFAULT_NODES } from './first-step.constants';
import { generateShortUID } from './utils';
import { useNamespaces } from 'hooks/api/namespaces/useNamespaces';

// TODO change to api request's result
// const dbEnvironmentOptions = [
//   {
//     value: 'dbEnvironmentOne',
//     label: 'dbEnvironmentOneLabel',
//   },
//   {
//     value: 'dbEnvironmentTwo',
//     label: 'dbEnvironmentTwoLabel',
//   },
// ];

export const FirstStep = ({ loadingDefaultsForEdition }: StepProps) => {
  const mode = useDatabasePageMode();

  const { watch, setValue, getFieldState, resetField, getValues, trigger } =
    useFormContext();

  const { data: clusterInfo, isFetching: clusterInfoFetching } =
    useKubernetesClusterInfo('wizard-k8-info');
  const { data: namespaces = [], isFetching: namespacesFetching } =
    useNamespaces();
  const dbType: DbType = watch(DbWizardFormFields.dbType);
  const dbVersion: DbType = watch(DbWizardFormFields.dbVersion);
  const dbNamespace = watch(DbWizardFormFields.k8sNamespace);

  const { data: dbEngines = [], isFetching: dbEnginesFetching } =
    useDbEngines(dbNamespace);
  const dbEngine = dbTypeToDbEngine(dbType);

  const [dbVersions, setDbVersions] = useState(
    dbEngines.find((engine) => engine.type === dbEngine)
  );

  const setRandomDbName = useCallback((type: DbType) => {
    setValue(DbWizardFormFields.dbName, `${type}-${generateShortUID()}`, {
      shouldValidate: true,
    });
  }, []);

  const setDbVersionsForEngine = useCallback(() => {
    const newVersions = dbEngines.find((engine) => engine.type === dbEngine);

    setDbVersions(newVersions);
  }, [dbEngine, dbEngines]);

  const updateDbVersions = useCallback(() => {
    const { isDirty: dbVersionDirty } = getFieldState(
      DbWizardFormFields.dbVersion
    );
    setDbVersionsForEngine();

    // Safety check
    if (
      dbVersionDirty ||
      !dbVersions ||
      !dbVersions.availableVersions.engine.length
    ) {
      return;
    }

    if (
      ((mode === 'edit' || mode === 'restoreFromBackup') && !dbVersion) ||
      mode === 'new'
    ) {
      const recommendedVersion = dbVersions.availableVersions.engine.find(
        (version) => version.status === DbEngineToolStatus.RECOMMENDED
      );
      setValue(
        DbWizardFormFields.dbVersion,
        recommendedVersion
          ? recommendedVersion.version
          : dbVersions.availableVersions.engine[0].version
      );
    }
  }, [
    dbVersion,
    dbVersions,
    getFieldState,
    mode,
    setDbVersionsForEngine,
    setValue,
  ]);

  const onDbTypeChange = useCallback(
    (newDbType: DbType) => {
      const { isDirty: isNameDirty } = getFieldState(DbWizardFormFields.dbName);
      const { isTouched: nodesTouched } = getFieldState(
        DbWizardFormFields.numberOfNodes
      );

      resetField(DbWizardFormFields.dbVersion);

      if (!isNameDirty) {
        setRandomDbName(newDbType);
      }

      if (mode === 'new') {
        if (nodesTouched) {
          const numberOfNodes: string = getValues(
            DbWizardFormFields.numberOfNodes
          );
          if (
            !NODES_DB_TYPE_MAP[newDbType].find(
              (nodes) => nodes === numberOfNodes
            )
          ) {
            setValue(
              DbWizardFormFields.numberOfNodes,
              DEFAULT_NODES[newDbType]
            );
          }
        } else {
          setValue(DbWizardFormFields.numberOfNodes, DEFAULT_NODES[newDbType]);
        }
      }

      updateDbVersions();
    },
    [
      getFieldState,
      resetField,
      setRandomDbName,
      mode,
      updateDbVersions,
      getValues,
      setValue,
    ]
  );

  useEffect(() => {
    if (mode !== 'new' || dbEngines.length <= 0) {
      return;
    }

    if (!dbType) {
      const defaultDbType = dbEngineToDbType(dbEngines[0].type);
      if (defaultDbType) {
        setValue(
          DbWizardFormFields.dbType,
          dbEngineToDbType(dbEngines[0].type)
        );
        setRandomDbName(defaultDbType);
      }
    }
    updateDbVersions();
  }, [dbEngines, dbType, setRandomDbName, updateDbVersions]);

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
    setDbVersionsForEngine();
  }, [setDbVersionsForEngine]);

  useEffect(() => {
    const { isTouched: k8sNamespaceTouched } = getFieldState(
      DbWizardFormFields.k8sNamespace
    );
    if (!k8sNamespaceTouched && mode === 'new' && namespaces?.length > 0) {
      setValue(DbWizardFormFields.k8sNamespace, namespaces[0]);
      trigger(DbWizardFormFields.k8sNamespace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespaces, mode]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
      <FormGroup sx={{ mt: 2 }}>
        <AutoCompleteInput
          labelProps={{
            sx: { mt: 1 },
          }}
          name={DbWizardFormFields.k8sNamespace}
          label={Messages.labels.k8sNamespace}
          loading={namespacesFetching}
          options={namespaces || []}
          disabled={
            mode === 'edit' ||
            mode === 'restoreFromBackup' ||
            loadingDefaultsForEdition
          }
          autoCompleteProps={{
            disableClearable: true,
            isOptionEqualToValue: (option, value) => option === value,
          }}
        />
        {/* @ts-ignore */}
        <Typography variant="sectionHeading" sx={{ mt: 4, mb: 0.5 }}>
          {Messages.labels.dbType}
        </Typography>
        {dbEnginesFetching || !dbEngines.length ? (
          // This is roughly the height of the buttons
          <Skeleton height={57} variant="rectangular" />
        ) : (
          <ToggleButtonGroupInput name={DbWizardFormFields.dbType}>
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
        <TextInput
          name={DbWizardFormFields.dbName}
          label={Messages.labels.dbName}
          textFieldProps={{
            placeholder: Messages.placeholders.dbName,
            disabled: mode === 'edit' || loadingDefaultsForEdition,
          }}
        />
        {/*<Typography variant="sectionHeading" sx={{ mt: 4, mb: 0.5 }}>*/}
        {/*  {Messages.labels.dbEnvironment}*/}
        {/*</Typography>*/}
        {/*<Controller
          control={control}
          name={DbWizardFormFields.dbEnvironment}
          render={({ field, fieldState: { error } }) => (
            <Select
              {...field}
              variant="outlined"
              error={error !== undefined}
              inputProps={{
                'data-testid': 'text-dbEnvironment',
              }}
            >
              {dbEnvironmentOptions.map((item) => (
                <MenuItem value={item.value} key={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          )}
        /> */}
        <SelectInput
          name={DbWizardFormFields.dbVersion}
          label={Messages.labels.dbVersion}
          selectFieldProps={{
            disabled: mode === 'restoreFromBackup' || mode === 'edit',
          }}
        >
          {dbVersions?.availableVersions.engine.map((version) => (
            <MenuItem value={version.version} key={version.version}>
              {version.version}
            </MenuItem>
          ))}
        </SelectInput>
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
      </FormGroup>
    </>
  );
};
