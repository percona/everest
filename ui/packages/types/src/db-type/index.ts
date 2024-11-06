enum DbType {
  Postresql = "postgresql",
  Mongo = "mongodb",
  Mysql = "mysql",
}

enum DbEngineType {
  PSMDB = "psmdb",
  PXC = "pxc",
  POSTGRESQL = "postgresql",
}

export type ProxyType = "mongos" | "haproxy" | "proxysql" | "pgbouncer";

export { DbType, DbEngineType };
