import { DbType } from '@percona/types';

export const getProxyUnitNamesFromDbType = (
  dbType: DbType
): { singular: string; plural: string } => {
  switch (dbType) {
    case DbType.Postresql:
      return { singular: 'PG Bouncer', plural: 'PG Bouncers' };
    case DbType.Mongo:
      return { singular: 'router', plural: 'routers' };
    case DbType.Mysql:
    default:
      return { singular: 'proxy', plural: 'proxies' };
  }
};
