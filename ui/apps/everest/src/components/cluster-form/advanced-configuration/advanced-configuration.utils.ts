import { DbType } from '@percona/types';
import { DbCluster, ProxyExposeType } from 'shared-types/dbCluster.types';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { AdvancedConfigurationFormType } from './advanced-configuration-schema';

export const getParamsPlaceholderFromDbType = (dbType: DbType) => {
  let dynamicText = '';

  switch (dbType) {
    case DbType.Mongo:
      dynamicText = 'operationProfiling:\nmode: slowOp\nslowOpThresholdMs: 200';
      break;
    case DbType.Mysql:
      dynamicText =
        '[mysqld]\nkey_buffer_size=16M\nmax_allowed_packet=128M\nmax_connections=250';
      break;
    case DbType.Postresql:
    default:
      dynamicText =
        'log_connections = yes\nsearch_path = \'"$user", public\'\nshared_buffers = 128MB';
      break;
  }

  return dynamicText && `${dynamicText}`;
};

export const advancedConfigurationModalDefaultValues = (
  dbCluster: DbCluster
): AdvancedConfigurationFormType => ({
  [AdvancedConfigurationFields.externalAccess]:
    dbCluster?.spec?.proxy?.expose?.type === ProxyExposeType.external,
  // [AdvancedConfigurationFields.internetFacing]: true,
  [AdvancedConfigurationFields.engineParametersEnabled]:
    !!dbCluster?.spec?.engine?.config,
  [AdvancedConfigurationFields.engineParameters]:
    dbCluster?.spec?.engine?.config,
  [AdvancedConfigurationFields.sourceRanges]: dbCluster?.spec?.proxy?.expose
    ?.ipSourceRanges
    ? dbCluster?.spec?.proxy?.expose?.ipSourceRanges.map((item) => ({
        sourceRange: item,
      }))
    : [{ sourceRange: '' }],
});
