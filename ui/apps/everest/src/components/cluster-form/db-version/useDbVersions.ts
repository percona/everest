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

import { useDbEngines } from 'hooks/api/db-engines';
import { dbTypeToDbEngine } from '@percona/utils';
import { useMemo } from 'react';
import { DbType } from '@percona/types';
import { filterAvailableDbVersionsForDbEngineEdition } from './utils';
import { WizardMode } from 'shared-types/wizard.types';

interface UseDbVersionProps {
  namespace: string;
  dbType: DbType;
  currentVersion: string;
}

export const useDbVersionsList = ({
  namespace,
  dbType,
  currentVersion,
}: UseDbVersionProps) => {
  // TODO: Replace 'in-cluster' with actual cluster selection logic
  const { data: dbEngines = [] } = useDbEngines('in-cluster', namespace);

  const dbEngine = dbTypeToDbEngine(dbType);

  return useMemo(() => {
    const data = dbEngines.find((engine) => engine.type === dbEngine);
    if (data) {
      return {
        ...data,
        availableVersions: {
          ...data?.availableVersions,
          engine: filterAvailableDbVersionsForDbEngineEdition(
            data,
            currentVersion,
            WizardMode.Edit
          ),
        },
      };
    }
    return data;
  }, [dbEngines, currentVersion, dbEngine]);
};
