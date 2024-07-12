const { EVEREST_BUCKETS_NAMESPACES_MAP } = process.env;

type BucketsNamespaceMap = [string, string[]][];

export const STORAGE_STATE_FILE = 'user.json';

export enum EVEREST_CI_NAMESPACES {
  EVEREST_UI = 'everest-ui',
  PSMDB_ONLY = 'psmdb-only',
  PXC_ONLY = 'pxc-only',
  PG_ONLY = 'pg-only',
}

export const getBucketNamespacesMap = (): BucketsNamespaceMap =>
  JSON.parse(EVEREST_BUCKETS_NAMESPACES_MAP);
