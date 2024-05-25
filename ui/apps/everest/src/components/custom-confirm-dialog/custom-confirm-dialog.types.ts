import { z } from 'zod';

export enum CustomConfirmDialogFields {
  confirmInput = 'confirmInput',
  dataCheckbox = 'dataCheckbox',
}

export const customConfirmDialogSchema = (
  value: string,
  confirmationInput: boolean
) =>
  z.object({
    [CustomConfirmDialogFields.confirmInput]: z
      .string()
      .trim()
      .pipe(
        z.literal(confirmationInput ? value : '', {
          errorMap: () => ({ message: '' }),
        })
      )
      .optional(),
    [CustomConfirmDialogFields.dataCheckbox]: z.boolean(),
  });

export type CustomConfirmDialogType = z.infer<
  ReturnType<typeof customConfirmDialogSchema>
>;
