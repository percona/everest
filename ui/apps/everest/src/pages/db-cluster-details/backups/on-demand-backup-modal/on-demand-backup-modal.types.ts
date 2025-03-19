import z from 'zod';
import { generateShortUID } from 'utils/generateShortUID';

export enum BackupFields {
  name = 'name',
  storageLocation = 'storageLocation',
}

export const defaultValuesFc = () => ({
  [BackupFields.name]: `backup-${generateShortUID()}`,
  [BackupFields.storageLocation]: null,
});

export const schema = (backupsNamesList: string[]) =>
  z.object({
    [BackupFields.name]: z
      .string()
      .min(1)
      .superRefine((input, ctx) => {
        if (backupsNamesList.find((item) => item === input)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'You already have a backup with this name',
          });
        }
      }),
    [BackupFields.storageLocation]: z
      .string()
      .or(
        z.object({
          name: z.string(),
        })
      )
      .nullable()
      .superRefine((input, ctx) => {
        if (!input || typeof input === 'string' || !input.name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Invalid option. Please make sure you added a backup storage and select it from the dropdown.',
          });
        }
      }),
  });

export type BackupFormData = z.infer<ReturnType<typeof schema>>;
