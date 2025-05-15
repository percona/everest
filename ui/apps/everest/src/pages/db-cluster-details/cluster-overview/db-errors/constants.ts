import { DbErrorType } from 'shared-types/dbErrors.types';

const humanizedErrorMessages: Record<DbErrorType, string> = {
  [DbErrorType.VolumeResizeFailed]:
    'An error occurred when resizing your cluster.',
};

export const humanizeDbError = (type: DbErrorType): string =>
  humanizedErrorMessages[type];
