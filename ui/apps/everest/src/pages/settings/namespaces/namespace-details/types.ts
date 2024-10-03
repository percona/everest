import { BoxProps } from '@mui/material';
import { UseOperatorsUpgradePlanType } from 'hooks/api/db-engines';
import {
  DbEngine,
  OperatorUpgradePendingAction,
  OperatorUpgradeTask,
} from 'shared-types/dbEngines.types';

export type UpgradeHeaderProps = {
  upgradeAvailable: boolean;
  pendingUpgradeTasks: boolean;
  upgradeAllowed: boolean;
  onUpgrade: () => void;
} & BoxProps;

export type ClusterStatusTableProps = {
  namespace: string;
  pendingActions: OperatorUpgradePendingAction[];
  dbEngines: DbEngine[];
};

export type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  namespace: string;
  operatorsUpgradeTasks: OperatorUpgradeTask[];
};

export type OperatorVersionsHeaderProps = {
  operatorsUpgradePlan: UseOperatorsUpgradePlanType;
};
