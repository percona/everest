const { EVEREST_BUCKETS_NAMESPACES_MAP, EVEREST_DIR, TAG_FOR_UPGRADE } =
  process.env;

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

export const everestdir = EVEREST_DIR;
export const everestTagForUpgrade = TAG_FOR_UPGRADE;

const OneMin = 60000;

export enum TIMEOUT {
  OneMinute = OneMin,
  ThreeMinutes = 3 * OneMin,
  FiveMinutes = 5 * OneMin,
  TenMinutes = 10 * OneMin,
  FifteenMinutes = 15 * OneMin,
  TwentyMinutes = 20 * OneMin,
  ThirtyMinutes = 30 * OneMin,
  SixtyMinutes = 60 * OneMin,
}
