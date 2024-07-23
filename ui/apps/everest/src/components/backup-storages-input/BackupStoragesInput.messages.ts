import { PG_SLOTS_LIMIT } from './constants';

export const Messages = {
  pgHelperText: (availableSlots: number) =>
    availableSlots >= PG_SLOTS_LIMIT
      ? `Use an existing storage for this schedule, as you've already used the allowed storage limit (${PG_SLOTS_LIMIT})`
      : `
    You are currently using ${availableSlots} out of ${PG_SLOTS_LIMIT} available storages.`,
};
