import z from 'zod';
import { generateShortUID } from '../../../../database-form/steps/first/utils.ts';

export type OnDemandBackupModalProps = {
  open: boolean;
  handleClose: () => void;
};

export enum BackupFields {
  name = 'name',
  storageLocation = 'storageLocation',
}

export const defaultValuesFc = () => ({
  [BackupFields.name]: `backup-${generateShortUID()}`,
  [BackupFields.storageLocation]: '',
});

export const schema = z.object({
  [BackupFields.name]: z.string().nonempty(),
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
            'Invalid option. Please make sure you added a storage location and select it from the dropdown.',
        });
      }
    }),
});

export type BackupFormData = z.infer<typeof schema>;
