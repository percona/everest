import { DbType } from '@percona/types';
import { Backup } from '../../../../shared-types/dbCluster.types';

export type OverviewCardProps = {
  loading?: boolean;
};

export type DatabaseDetailsOverviewCardProps = {
  name: string;
  namespace: string;
  type: DbType;
  version: string;
  numberOfNodes: number;
  cpu: number | string;
  memory: number | string;
  disk: number | string;
  externalAccess: boolean;
  monitoring?: string;
  backup?: Backup;
} & OverviewCardProps;

export type ConnectionDetailsOverviewCardProps = {
  loadingClusterDetails: boolean;
  // Since we do hostname.split, we must do proper checks
  hostname?: string;
  port: number;
  username: string;
  password: string;
} & OverviewCardProps;

export type BackupsDetailsOverviewCardProps = {
  scheduledBackups?: boolean;
} & OverviewCardProps;
