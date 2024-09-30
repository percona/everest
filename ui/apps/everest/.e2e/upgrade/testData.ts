import { everestTagForUpgrade } from '../constants';

export const pxcDBCluster = {
  name: 'ps-db-cluster',
  numberOfNodes: 1,
  cpu: 0.6,
  disk: 1,
  memory: 1,
  externalAccess: true,
  sourceRanges: [
    {
      sourceRange: 'http://192.168.1.1',
    },
  ],
};

export const mongoDBCluster = {
  name: 'mongo-db-cluster',
  numberOfNodes: 3,
  cpu: 1,
  disk: 1,
  memory: 1,
  externalAccess: true,
};

export const postgresDBCluster = {
  name: 'postgres-db-cluster',
  numberOfNodes: 1,
  cpu: 1,
  disk: 1,
  memory: 1,
  externalAccess: true,
};

export const expectedEverestUpgradeLog = (
  tag = everestTagForUpgrade.replaceAll('v', '')
) => {
  return `✓ Upgrade Operator Lifecycle Manager
✓ Upgrade Percona Catalog
✓ Wait for Everest Operator InstallPlan
✓ Upgrade Everest API server
✓ Upgrade Everest Operator
✓ Run post-upgrade tasks

 🚀 Everest has been upgraded to version ${tag}


To view the password for the 'admin' user, run the following command:

everestctl accounts initial-admin-password


IMPORTANT: This password is NOT stored in a hashed format. To secure it, update the password using the following command:

everestctl accounts set-password --username admin`;
};
