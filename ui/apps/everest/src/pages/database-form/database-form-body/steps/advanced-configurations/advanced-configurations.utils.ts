import { DbType } from '@percona/types';

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
