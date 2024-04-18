import { RestoreStatus } from 'shared-types/restores.types';
import { BaseStatus } from 'components/status-field/status-field.types';

export const RESTORE_STATUS_TO_BASE_STATUS: Record<RestoreStatus, BaseStatus> =
  {
    [RestoreStatus.PITR_RECOVERING]: 'pending',
    [RestoreStatus.READY]: 'pending',
    [RestoreStatus.REQUESTED]: 'pending',
    [RestoreStatus.RESTORING]: 'pending',
    [RestoreStatus.STARTING]: 'pending',
    [RestoreStatus.STARTING_CLUSTER]: 'pending',
    [RestoreStatus.STOPPING]: 'pending',
    [RestoreStatus.WAITING]: 'pending',
    [RestoreStatus.RUNNING]: 'pending',
    [RestoreStatus.ERROR]: 'error',
    [RestoreStatus.FAILED]: 'error',
    [RestoreStatus.REJECTED]: 'error',
    [RestoreStatus.SUCCEEDED]: 'success',
  };
