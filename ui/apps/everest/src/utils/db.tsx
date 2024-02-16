import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbType } from '@percona/types';

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
