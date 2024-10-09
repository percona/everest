import { BaseStatus } from 'components/status-field/status-field.types';

export enum COMPONENT_STATUS {
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  UNKNOWN = 'Unknown',
}

export const COMPONENT_STATUS_WEIGHT = {
  [COMPONENT_STATUS.PENDING]: 1,
  [COMPONENT_STATUS.FAILED]: 0,
  [COMPONENT_STATUS.RUNNING]: 0,
  [COMPONENT_STATUS.SUCCEEDED]: 0,
  [COMPONENT_STATUS.UNKNOWN]: 0,
};

export const COMPONENT_STATUS_TO_BASE_STATUS: Record<
  COMPONENT_STATUS,
  BaseStatus
> = {
  [COMPONENT_STATUS.PENDING]: 'pending',
  [COMPONENT_STATUS.FAILED]: 'error',
  [COMPONENT_STATUS.RUNNING]: 'pending',
  [COMPONENT_STATUS.SUCCEEDED]: 'success',
  [COMPONENT_STATUS.UNKNOWN]: 'unknown',
};

export const componentStatusToBaseStatus = (
  ready: string
): Record<COMPONENT_STATUS, BaseStatus> => {
  const arr = ready ? ready.split('/') : [];
  if (arr.length === 2 && arr[0] === arr[1]) {
    return {
      ...COMPONENT_STATUS_TO_BASE_STATUS,
      [COMPONENT_STATUS.RUNNING]: 'success',
    };
  }
  return COMPONENT_STATUS_TO_BASE_STATUS;
};

export enum CONTAINER_STATUS {
  RUNNING = 'Running',
  WAITING = 'Waiting',
  TERMINATED = 'Terminated',
}

export const CONTAINER_STATUS_TO_BASE_STATUS: Record<
  CONTAINER_STATUS,
  BaseStatus
> = {
  [CONTAINER_STATUS.RUNNING]: 'success',
  [CONTAINER_STATUS.WAITING]: 'pending',
  [CONTAINER_STATUS.TERMINATED]: 'paused',
};

export const containerStatusToBaseStatus = (
  ready: boolean
): Record<CONTAINER_STATUS, BaseStatus> => {
  if (!ready) {
    return {
      ...CONTAINER_STATUS_TO_BASE_STATUS,
      [CONTAINER_STATUS.RUNNING]: 'pending',
    };
  }
  return CONTAINER_STATUS_TO_BASE_STATUS;
};
