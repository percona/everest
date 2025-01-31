import { DbType } from '@percona/types';
import { AffinityComponent } from 'shared-types/affinity.types';

export const availableComponentsType = (
  dbType: DbType,
  isShardingEnabled: boolean
): AffinityComponent[] => {
  const availableTypes =
    dbType === DbType.Mongo
      ? isShardingEnabled
        ? [
            AffinityComponent.ConfigServer,
            AffinityComponent.DbNode,
            AffinityComponent.Proxy,
          ]
        : [AffinityComponent.DbNode]
      : [AffinityComponent.DbNode, AffinityComponent.Proxy];

  return availableTypes.sort();
};
