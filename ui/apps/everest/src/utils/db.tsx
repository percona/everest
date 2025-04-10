import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbEngineType, DbType, ProxyType } from '@percona/types';
import {
  DbCluster,
  DbClusterStatus,
  ManageableSchedules,
  Proxy,
  ProxyExposeConfig,
  ProxyExposeType,
  Schedule,
} from 'shared-types/dbCluster.types';
import { can } from './rbac';
import { getProxySpec } from 'hooks/api/db-cluster/utils';
import { dbEngineToDbType } from '@percona/utils';
import { MIN_NUMBER_OF_SHARDS } from 'components/cluster-form';
import cronConverter from './cron-converter';

export const dbTypeToIcon = (dbType: DbType) => {
  switch (dbType) {
    case DbType.Mongo:
      return MongoIcon;
    case DbType.Mysql:
      return MySqlIcon;
    default:
      return PostgreSqlIcon;
  }
};

export const shortenOperatorName = (name: string) => {
  if (name.includes('postgresql')) {
    return 'postgresql';
  }

  if (name.includes('xtradb')) {
    return 'pxc';
  }

  if (name.includes('mongodb')) {
    return 'psmdb';
  }

  return name;
};

export const dbTypeToProxyType = (dbType: DbType): ProxyType => {
  switch (dbType) {
    case DbType.Mongo:
      return 'mongos';
    case DbType.Mysql:
      return 'haproxy';
    default:
      return 'pgbouncer';
  }
};

export const isProxy = (proxy: Proxy | ProxyExposeConfig): proxy is Proxy => {
  return proxy && typeof (proxy as Proxy).expose === 'object';
};

export const transformSchedulesIntoManageableSchedules = async (
  schedules: Schedule[],
  namespace: string,
  canCreateBackups: boolean,
  canUpdateDb: boolean
) => {
  const transformedSchedules: ManageableSchedules[] = await Promise.all(
    schedules.map(async (schedule) => ({
      ...schedule,
      canBeManaged:
        (await can(
          'read',
          'backup-storages',
          `${namespace}/${schedule.backupStorageName}`
        )) &&
        canCreateBackups &&
        canUpdateDb,
    }))
  );

  return transformedSchedules;
};

export const changeDbClusterCrd = (
  dbCluster: DbCluster,
  newCrdVersion: string
): DbCluster => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      crVersion: newCrdVersion,
    },
  },
});

export const changeDbClusterAdvancedConfig = (
  dbCluster: DbCluster,
  engineParametersEnabled = false,
  externalAccess = false,
  engineParameters = '',
  sourceRanges?: Array<{ sourceRange?: string }>
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      config: engineParametersEnabled ? engineParameters : '',
    },
    proxy: {
      ...dbCluster.spec.proxy,
      expose: {
        type: externalAccess
          ? ProxyExposeType.external
          : ProxyExposeType.internal,
        ...(!!externalAccess &&
          sourceRanges && {
            ipSourceRanges: sourceRanges.flatMap((source) =>
              source.sourceRange ? [source.sourceRange] : []
            ),
          }),
      },
    } as Proxy,
  },
});

export const changeDbClusterVersion = (
  dbCluster: DbCluster,
  dbVersion: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      version: dbVersion,
    },
  },
});

export const changeDbClusterMonitoring = (
  dbCluster: DbCluster,
  monitoringName?: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    monitoring: monitoringName
      ? {
          monitoringConfigName: monitoringName,
        }
      : {},
  },
});

export const changeDbClusterResources = (
  dbCluster: DbCluster,
  newResources: {
    cpu: number;
    memory: number;
    disk: number;
    diskUnit: string;
    numberOfNodes: number;
    proxyCpu: number;
    proxyMemory: number;
    numberOfProxies: number;
  },
  sharding = false,
  shardNr = '',
  shardConfigServers?: number
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      replicas: newResources.numberOfNodes,
      resources: {
        cpu: `${newResources.cpu}`,
        memory: `${newResources.memory}G`,
      },
      storage: {
        ...dbCluster.spec.engine.storage,
        size: `${newResources.disk}${newResources.diskUnit}`,
      },
    },
    proxy: getProxySpec(
      dbEngineToDbType(dbCluster.spec.engine.type),
      newResources.numberOfProxies.toString(),
      '',
      (dbCluster.spec.proxy as Proxy).expose.type === 'external',
      newResources.proxyCpu,
      newResources.proxyMemory,
      !!sharding,
      ((dbCluster.spec.proxy as Proxy).expose.ipSourceRanges || []).map(
        (sourceRange) => ({ sourceRange })
      )
    ),
    ...(dbCluster.spec.engine.type === DbEngineType.PSMDB &&
      sharding && {
        sharding: {
          enabled: sharding,
          shards: +(shardNr ?? MIN_NUMBER_OF_SHARDS),
          configServer: {
            replicas: shardConfigServers ?? 3,
          },
        },
      }),
  },
});

export const changeDbClusterEngine = (
  dbCluster: DbCluster,
  newEngineVersion: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      version: newEngineVersion,
    },
  },
});

export const changeDbClusterPITR = (
  dbCluster: DbCluster,
  enabled: boolean,
  backupStorageName: string | { name: string }
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    backup: {
      ...dbCluster.spec.backup!,
      pitr: enabled
        ? {
            backupStorageName:
              typeof backupStorageName === 'string'
                ? backupStorageName
                : backupStorageName!.name,
            enabled: true,
          }
        : { enabled: false, backupStorageName: '' },
    },
  },
});

export const deleteScheduleFromDbCluster = (
  scheduleName: string,
  dbCluster: DbCluster,
  disablePITR: boolean
): DbCluster => {
  const schedules = dbCluster?.spec?.backup?.schedules || [];
  const filteredSchedulesWithCronCorrection = schedules.reduce(
    (result: Schedule[], schedule) => {
      if (schedule?.name !== scheduleName) {
        result.push(schedule);
      }
      return result;
    },
    []
  );

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster.spec.backup,
        ...(disablePITR && {
          pitr: {
            ...dbCluster.spec.backup?.pitr,
            backupStorageName:
              dbCluster.spec.backup?.pitr?.backupStorageName || '',
            enabled: false,
          },
        }),
        schedules:
          filteredSchedulesWithCronCorrection.length > 0
            ? filteredSchedulesWithCronCorrection
            : undefined,
      },
    },
  };
};

export const setDbClusterPausedStatus = (
  dbCluster: DbCluster,
  paused: boolean
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    paused,
  },
});

export const setDbClusterRestart = (dbCluster: DbCluster) => ({
  ...dbCluster,
  metadata: {
    ...dbCluster.metadata,
    annotations: {
      'everest.percona.com/restart': 'true',
    },
  },
});

const humanizedDbMap: Record<DbType, string> = {
  [DbType.Postresql]: 'PostgreSQL',
  [DbType.Mongo]: 'MongoDB',
  [DbType.Mysql]: 'MySQL',
};

export const humanizeDbType = (type: DbType): string => humanizedDbMap[type];

// This does not apply to the delete action, which is only blocked when the db is being deleted itself
export const shouldDbActionsBeBlocked = (status?: DbClusterStatus) => {
  return [
    DbClusterStatus.restoring,
    DbClusterStatus.deleting,
    DbClusterStatus.resizingVolumes,
    DbClusterStatus.upgrading,
  ].includes(status || ('' as DbClusterStatus));
};

export const mergeNewDbClusterData = (
  oldDbClusterData: DbCluster = {} as DbCluster,
  newDbClusterData: DbCluster,
  // When using setQueryData, the data is already in UTC and will be used by queryClient BEFORE `select`, so it has to be in UTC, as if coming from the API
  // In those cases, we don't want to convert the schedule to local timezone
  convertToLocalTimezone: boolean
): DbCluster => {
  const newCluster = {
    ...oldDbClusterData,
    ...newDbClusterData,
    spec: {
      ...newDbClusterData.spec,
      ...(newDbClusterData.spec?.backup?.schedules && {
        backup: {
          ...newDbClusterData.spec.backup,
          schedules: newDbClusterData.spec.backup.schedules.map((schedule) => ({
            ...schedule,
            schedule: convertToLocalTimezone
              ? cronConverter(
                  schedule.schedule,
                  'UTC',
                  Intl.DateTimeFormat().resolvedOptions().timeZone
                )
              : schedule.schedule,
          })),
        },
      }),
    },
  };

  return newCluster;
};
