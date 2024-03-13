import { storageLocationScheduleFormSchema } from 'components/schedule-form/schedule-form-schema.ts';
import { Messages as ScheduleFormMessages } from 'components/schedule-form/schedule-form.messages.ts';
import { ScheduleFormFields } from 'components/schedule-form/schedule-form.types.ts';
import { timeSelectionSchemaObject } from 'components/time-selection/time-selection-schema.ts';
import { rfc_123_schema } from 'utils/common-validation.ts';
import { z } from 'zod';
import { MAX_SCHEDULE_NAME_LENGTH } from '../../../../../consts.ts';
import { DbWizardFormFields } from '../../../database-form.types.ts';

const backupsValidationObject = {
  backupsEnabled: z.boolean(),
  // pitrEnabled: z.boolean(),
  // pitrTime: z.string(),
};

const backupsWithScheduleValidationObject = {
  ...backupsValidationObject,
  [ScheduleFormFields.scheduleName]: rfc_123_schema(
    `${ScheduleFormMessages.scheduleName.label.toLowerCase()} name`
  )
    .max(MAX_SCHEDULE_NAME_LENGTH, ScheduleFormMessages.scheduleName.tooLong)
    .optional(),
  ...timeSelectionSchemaObject,
  ...storageLocationScheduleFormSchema('dbWizard'),
};

export const backupsValidationSchema = z
  .object(backupsValidationObject)
  .passthrough();

export const backupsWithScheduleValidationSchema = z
  .object(backupsWithScheduleValidationObject)
  .passthrough()
  .superRefine(({ backupsEnabled, storageLocation }, ctx) => {
    if (backupsEnabled && !storageLocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [DbWizardFormFields.storageLocation],
        message: ScheduleFormMessages.storageLocation.invalidOption,
      });
    }
  });

export type BackupsValidationSchemaType = z.infer<
  typeof backupsValidationSchema
>;
export type BackupsWithScheduleValidationSchemaType = z.infer<
  typeof backupsWithScheduleValidationSchema
>;
