import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbType } from '@percona/types';
import { Proxy } from 'shared-types/dbCluster.types';

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

export const isProxy = (
  proxy: Proxy | Record<string, never>
): proxy is Proxy => {
  return (
    proxy && typeof proxy.expose === 'object' && typeof proxy.type === 'string'
  );
};
