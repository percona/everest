import { DbType } from '@percona/types';
import { AffinityComponent } from 'shared-types/affinity.types';

export const availableComponentsType = (
  dbType: DbType,
  isShardingEnabled: boolean
): AffinityComponent[] => {
  return dbType === DbType.Mongo
    ? isShardingEnabled
      ? [
          AffinityComponent.ConfigServer,
          AffinityComponent.DbNode,
          AffinityComponent.Proxy,
        ]
      : [AffinityComponent.DbNode]
    : [AffinityComponent.DbNode, AffinityComponent.Proxy];
};
