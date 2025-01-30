import { everestTagForUpgrade, everestFeatureBuildForUpgrade } from '@e2e/constants';

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
  const version = typeof everestFeatureBuildForUpgrade !== 'undefined' && everestFeatureBuildForUpgrade
    ? everestFeatureBuildForUpgrade
    : tag;

  return `ℹ️  Upgrading Everest to version ${version}

✓ Upgrading Custom Resource Definitions
✓ Upgrading Helm chart
✓ Ensuring Everest API deployment is ready
✓ Ensuring Everest operator deployment is ready
✓ Ensuring Everest CatalogSource is ready

 🚀 Everest has been upgraded to version ${version}


Run the following command to get the initial admin password:

	everestctl accounts initial-admin-password

NOTE: The initial password is stored in plain text. For security, change it immediately using the following command:

	everestctl accounts set-password --username admin`;
};