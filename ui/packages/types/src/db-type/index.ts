enum DbType {
  Postresql = 'postgresql',
  Mongo = 'mongodb',
  Mysql = 'mysql',
}

enum DbEngineType {
  PSMDB = 'psmdb',
  PXC = 'pxc',
  POSTGRESQL = 'postgresql',
}

export { DbType, DbEngineType };
