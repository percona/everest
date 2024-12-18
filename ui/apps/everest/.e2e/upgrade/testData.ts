import { everestTagForUpgrade } from '@e2e/constants';

export const pxcDBCluster = {
  name: 'pxc-db-cluster',
  numberOfNodes: 3,
  numberOfProxies: 2,
  cpu: 0.6,
  disk: 5,
  memory: 1,
  externalAccess: false,
//  sourceRanges: [
//    {
//      sourceRange: 'http://192.168.1.1',
//    },
//  ],
};

export const mongoDBCluster = {
  name: 'psmdb-db-cluster',
  numberOfNodes: 3,
  cpu: 0.6,
  disk: 5,
  memory: 1,
  externalAccess: false,
};

export const postgresDBCluster = {
  name: 'postgresql-db-cluster',
  numberOfNodes: 3,
  numberOfProxies: 2,
  cpu: 0.6,
  disk: 5,
  memory: 1,
  externalAccess: false,
};

export const expectedEverestUpgradeLog = (
  tag = everestTagForUpgrade.replace(/v/g, '')
) => {
  return `ℹ️  Upgrading Everest to version ${tag}

✓ Upgrading Custom Resource Definitions
✓ Upgrading Helm chart
✓ Ensuring Everest API deployment is ready
✓ Ensuring Everest operator deployment is ready
✓ Ensuring Everest CatalogSource is ready

 🚀 Everest has been upgraded to version ${tag}


To view the password for the 'admin' user, run the following command:

everestctl accounts initial-admin-password


IMPORTANT: This password is NOT stored in a hashed format. To secure it, update the password using the following command:

everestctl accounts set-password --username admin`;
};
