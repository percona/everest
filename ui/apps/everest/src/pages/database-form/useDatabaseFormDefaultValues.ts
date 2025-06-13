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

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import { DbCluster } from 'shared-types/dbCluster.types';

import {
  DbClusterPayloadToFormValues,
  getDbWizardDefaultValues,
} from './database-form.utils';
import { DbWizardType } from './database-form-schema.ts';
import { dbEngineToDbType } from '@percona/utils';
import { WizardMode } from 'shared-types/wizard.types.ts';

export const useDatabasePageDefaultValues = (
  mode: WizardMode
): {
  defaultValues: DbWizardType;
  dbClusterData: DbCluster | undefined;
  dbClusterRequestStatus: 'error' | 'idle' | 'pending' | 'success';
  isFetching: boolean;
} => {
  const { state } = useLocation();
  const shouldRetrieveDbClusterData =
    mode === WizardMode.Restore && !!state?.selectedDbCluster;
  const namespace = shouldRetrieveDbClusterData ? state?.namespace : null;
  const {
    data: dbCluster,
    status: dbClusterRequestStatus,
    isFetching,
  } = useDbCluster(state?.selectedDbCluster, namespace, 'in-cluster', {
    enabled: !!state?.selectedDbCluster && !!namespace,
  });

  const [defaultValues, setDefaultValues] = useState<DbWizardType>(() => {
    const dbType = dbEngineToDbType(state?.selectedDbEngine);
    const defaults = getDbWizardDefaultValues(dbType);

    if (mode === WizardMode.New) {
      return getDbWizardDefaultValues(dbType);
    } else {
      return dbClusterRequestStatus === 'success'
        ? DbClusterPayloadToFormValues(dbCluster, mode, namespace)
        : defaults;
    }
  });

  useEffect(() => {
    // dbClusterRequestStatus === 'success' when the request is enabled, which only happens if shouldRetrieveDbClusterData === true
    // hence, no need to re-check mode and so on here
    if (dbClusterRequestStatus === 'success' && dbCluster) {
      setDefaultValues(
        DbClusterPayloadToFormValues(dbCluster, mode, namespace)
      );
    }
  }, [dbCluster, dbClusterRequestStatus, mode, namespace]);

  return {
    defaultValues,
    dbClusterData: dbCluster,
    dbClusterRequestStatus,
    isFetching,
  };
};
