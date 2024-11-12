import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbType, ProxyType } from '@percona/types';
import {
  ManageableSchedules,
  Proxy,
  ProxyExposeConfig,
  Schedule,
} from 'shared-types/dbCluster.types';
import { can } from './rbac';

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
