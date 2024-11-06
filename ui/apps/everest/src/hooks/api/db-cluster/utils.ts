import { DbType } from '@percona/types';
import { dbTypeToProxyType } from '@percona/utils';
import { CUSTOM_NR_UNITS_INPUT_VALUE } from 'components/cluster-form';
import {
  Proxy,
  ProxyExposeConfig,
  ProxyExposeType,
} from 'shared-types/dbCluster.types';

const getExposteConfig = (
  externalAccess: boolean,
  sourceRanges?: Array<{ sourceRange?: string }>
): ProxyExposeConfig => ({
  type: externalAccess ? ProxyExposeType.external : ProxyExposeType.internal,
  ...(!!externalAccess &&
    sourceRanges && {
      ipSourceRanges: sourceRanges.flatMap((source) =>
        source.sourceRange ? [source.sourceRange] : []
      ),
    }),
});

export const getProxySpec = (
  dbType: DbType,
  numberOfProxies: string,
  customNrOfProxies: string,
  externalAccess: boolean,
  cpu: number,
  memory: number,
  sharding: boolean,
  sourceRanges?: Array<{ sourceRange?: string }>
): Proxy | ProxyExposeConfig => {
  if (dbType === DbType.Mongo && !sharding) {
    return {
      expose: getExposteConfig(externalAccess, sourceRanges),
    } as unknown as ProxyExposeConfig;
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
    expose: getExposteConfig(externalAccess, sourceRanges),
  };
};
