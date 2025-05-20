import { DbType } from '@percona/types';
import { AffinityComponent } from 'shared-types/affinity.types';

export const availableComponentsType = (
  dbType: DbType
): AffinityComponent[] => {
  const availableTypes =
    dbType === DbType.Mongo
      ? [
          AffinityComponent.ConfigServer,
          AffinityComponent.DbNode,
          AffinityComponent.Proxy,
        ]
      : [AffinityComponent.DbNode, AffinityComponent.Proxy];

  return availableTypes.sort();
};
