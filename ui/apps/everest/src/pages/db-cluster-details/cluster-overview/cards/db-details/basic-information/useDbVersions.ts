import {useDbEngines} from '../../../../../../hooks/api/db-engines';
import {dbTypeToDbEngine} from '@percona/utils';
import {useMemo} from 'react';
import {DbType} from '@percona/types';
import {
  filterAvailableDbVersionsForDbEngineEdition
} from '../../../../../database-form/database-form-body/steps/first/utils';

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
  debugger;
  const { data: dbEngines = [] } = useDbEngines(namespace, {
    gcTime: 1000 * 5,
  });

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
              currentVersion
          ),
        },
      };
    }
    return data;
  }, [dbEngines]);
};
