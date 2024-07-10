type BucketsNamespaceMap = [string, string[]][];

let bucketNamespacesMap: BucketsNamespaceMap = [];
export const STORAGE_STATE_FILE = 'user.json';

export enum EVEREST_CI_NAMESPACES {
  EVEREST_UI = 'everest-ui',
  PSMDB_ONLY = 'psmdb-only',
  PXC_ONLY = 'pxc-only',
  PG_ONLY = 'pg-only',
}

export const setBucketNamespacesMap = (map: BucketsNamespaceMap) => {
  bucketNamespacesMap = map;
};

export const getBucketNamespacesMap = () => bucketNamespacesMap;
