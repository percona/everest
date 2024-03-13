import { z } from 'zod';

export enum ConfirmFormDialogFields {
  confirmInput = 'confirmInput',
}

export const confirmFormDialogSchema = (value: string) =>
  z.object({
    [ConfirmFormDialogFields.confirmInput]: z.literal(value, {
      errorMap: () => ({ message: '' }),
    }),
  });
