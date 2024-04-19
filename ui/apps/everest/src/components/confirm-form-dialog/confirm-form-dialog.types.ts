import { z } from 'zod';

export enum ConfirmFormDialogFields {
  confirmInput = 'confirmInput',
  cleanupBackupStorage = 'cleanupBackupStorage',
}

export const confirmFormDialogSchema = (value: string) =>
  z.object({
    [ConfirmFormDialogFields.confirmInput]: z.literal(value, {
      errorMap: () => ({ message: '' }),
    }),
    [ConfirmFormDialogFields.cleanupBackupStorage]: z.boolean(),
  });

export type ConfirmDialogType = z.infer<
  ReturnType<typeof confirmFormDialogSchema>
>;
