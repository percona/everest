import { DbType } from '@percona/types';

export const DEFAULT_NODES: Record<DbType, string> = {
  [DbType.Mongo]: '3',
  [DbType.Mysql]: '3',
  [DbType.Postresql]: '2',
};
