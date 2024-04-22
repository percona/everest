import { z } from 'zod';

export enum ConfirmFormDialogFields {
  confirmInput = 'confirmInput',
  cleanupBackupStorage = 'cleanupBackupStorage',
}

export const confirmFormDialogSchema = (
  value: string,
  confirmationInput: boolean
) =>
  z.object({
    [ConfirmFormDialogFields.confirmInput]: z
      .literal(confirmationInput ? value : '', {
        errorMap: () => ({ message: '' }),
      })
      .optional(),
    [ConfirmFormDialogFields.cleanupBackupStorage]: z.boolean(),
  });

export type ConfirmDialogType = z.infer<
  ReturnType<typeof confirmFormDialogSchema>
>;
