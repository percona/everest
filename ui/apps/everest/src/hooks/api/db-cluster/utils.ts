import { DbType } from '@percona/types';
import { CUSTOM_NR_UNITS_INPUT_VALUE } from 'components/cluster-form';
import { Proxy, ProxyExposeType } from 'shared-types/dbCluster.types';
import { dbTypeToProxyType } from 'utils/db';

export const getProxySpec = (
  dbType: DbType,
  numberOfProxies: string,
  customNrOfProxies: string,
  externalAccess: boolean,
  cpu: number,
  memory: number,
  sharding: boolean,
  sourceRanges?: Array<{ sourceRange?: string }>
): Proxy | Record<string, never> => {
  console.log('dbType', dbType);
  console.log('sharding', sharding);
  if (dbType === DbType.Mongo && !sharding) {
    console.log('returning empty object');
    return {};
  }
  const proxyNr = parseInt(
    numberOfProxies === CUSTOM_NR_UNITS_INPUT_VALUE
      ? customNrOfProxies
      : numberOfProxies,
    10
  );
  // const showResources =
  //   dbType !== DbType.Mongo || (dbType === DbType.Mongo && !sharding);

  return {
    type: dbTypeToProxyType(dbType),
    replicas: proxyNr,
    resources: {
      cpu: `${cpu}`,
      memory: `${memory}G`,
    },
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
  };
};
