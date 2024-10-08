export type OperatorVersions = {
  name: string;
  shortName: string;
  version: string;
  oldVersion: string;
};

export enum Operator {
  PXC = 'percona-xtradb-cluster-operator',
  PSMDB = 'percona-server-mongodb-operator',
  PG = 'percona-postgresql-operator',
}
