import { isAfter, isBefore, isDate } from 'date-fns';
import { z } from 'zod';

export enum RestoreDbFields {
  backupType = 'backupType',
  backupName = 'backupName',
  pitrBackup = 'pitrBackup',
}

export enum BackuptypeValues {
  fromBackup = 'fromBackup',
  fromPitr = 'fromPITR',
}

export const schema = (gaps: boolean, minDate?: Date, maxDate?: Date) =>
  z
    .object({
      [RestoreDbFields.backupType]: z.nativeEnum(BackuptypeValues),
      [RestoreDbFields.backupName]: z.string().optional(),
      [RestoreDbFields.pitrBackup]: z.string().or(z.date()).optional(),
    })
    .superRefine(({ backupType, backupName, pitrBackup }, ctx) => {
      if (backupType === BackuptypeValues.fromBackup) {
        if (!backupName) {
          ctx.addIssue({
            type: 'string',
            inclusive: true,
            code: z.ZodIssueCode.too_small,
            minimum: 1,
          });
        }
      } else {
        if (isDate(minDate) && isDate(maxDate) && !!pitrBackup) {
          const pitrBackupDate = isDate(pitrBackup)
            ? pitrBackup
            : new Date(pitrBackup);
          if (
            isAfter(pitrBackupDate, maxDate) ||
            isBefore(pitrBackupDate, minDate)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.invalid_date,
            });
          }
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
          });
        }

        if (gaps) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
          });
        }

        if (!pitrBackup) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_date,
          });
        }
      }
    });

export const defaultValues = {
  [RestoreDbFields.backupType]: BackuptypeValues.fromBackup,
  [RestoreDbFields.backupName]: '',
  [RestoreDbFields.pitrBackup]: '',
};

export type RestoreDbFormData = z.infer<ReturnType<typeof schema>>;
