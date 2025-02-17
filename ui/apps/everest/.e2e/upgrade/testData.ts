import {
  everestTagForUpgrade,
  everestFeatureBuildForUpgrade,
} from '@e2e/constants';

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

export const expectedEverestUpgradeFirstLine = (
  tag = everestTagForUpgrade.replace(/v/g, '')
) => {
  const version =
    typeof everestFeatureBuildForUpgrade !== 'undefined' &&
    everestFeatureBuildForUpgrade
      ? everestFeatureBuildForUpgrade
      : tag;

  return `ℹ️  Upgrading Everest to version ${version}`;
};

export const expectedEverestUpgradeCRDLine = () => {
  return `✅  Upgrading Custom Resource Definitions`;
};

export const expectedEverestUpgradeHelmLine = () => {
  return `✅  Upgrading Helm chart`;
};

export const expectedEverestUpgradeAPILine = () => {
  return `✅  Ensuring Everest API deployment is ready`;
};

export const expectedEverestUpgradeOperatorLine = () => {
  return `✅  Ensuring Everest operator deployment is ready`;
};

export const expectedEverestUpgradeCatalogLine = () => {
  return `✅  Ensuring Everest CatalogSource is ready`;
};

export const expectedEverestUpgradeLastLine = (
  tag = everestTagForUpgrade.replace(/v/g, '')
) => {
  const version =
    typeof everestFeatureBuildForUpgrade !== 'undefined' &&
    everestFeatureBuildForUpgrade
      ? everestFeatureBuildForUpgrade
      : tag;

  return ` 🚀 Everest has been upgraded to version ${version}`;
};
