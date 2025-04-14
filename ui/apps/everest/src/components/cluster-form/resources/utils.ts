import { DbType } from '@percona/types';
import { Path, UseFormGetFieldState } from 'react-hook-form';

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

export const getPreviewResourcesText = (
  type: 'CPU' | 'Memory' | 'Disk',
  parsedResource: number,
  sharding: boolean,
  measurementUnit: string,
  parsedShardNr?: number
) => {
  return Number.isNaN(parsedResource)
    ? ''
    : `${type} - ${sharding && parsedShardNr ? (parsedShardNr * parsedResource).toFixed(2) : parsedResource.toFixed(2)} ${measurementUnit}`;
};

export const someErrorInStateFields = <T extends Record<string, unknown>>(
  fieldStateGetter: UseFormGetFieldState<T>,
  fields: Path<T>[]
) => {
  return fields.some((field) => fieldStateGetter(field)?.error);
};
