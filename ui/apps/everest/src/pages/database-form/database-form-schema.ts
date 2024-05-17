import { z } from 'zod';
import { DbType } from '@percona/types';
import { IP_REGEX, MAX_DB_CLUSTER_NAME_LENGTH } from '../../consts.ts';
import { Messages } from './database-form.messages.ts';
import { ResourceSize } from './database-form-body/steps/resources/resources-step.types.ts';
import { DbWizardFormFields } from './database-form.types.ts';
import { rfc_123_schema } from 'utils/common-validation.ts';
import { Messages as ScheduleFormMessages } from 'components/schedule-form-dialog/schedule-form/schedule-form.messages.ts';

const resourceToNumber = (minimum = 0) =>
  z.union([z.string().nonempty(), z.number()]).pipe(
    z.coerce
      .number({
        invalid_type_error: 'Please enter a valid number',
      })
      .min(minimum)
  );

const basicInfoSchema = z
  .object({
    [DbWizardFormFields.dbType]: z.nativeEnum(DbType),
    [DbWizardFormFields.dbName]: rfc_123_schema('database name')
      .max(MAX_DB_CLUSTER_NAME_LENGTH, Messages.errors.dbName.tooLong)
      .nonempty(),
    [DbWizardFormFields.k8sNamespace]: z.string().nullable(),
    [DbWizardFormFields.dbVersion]: z.string().nonempty(),
    [DbWizardFormFields.storageClass]: z
      .string()
      .nullable()
      .superRefine((input, ctx) => {
        if (!input) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.storageClass.invalid,
          });
        }
      }),
  })
  .passthrough();

// .passthrough tells Zod to not drop unrecognized keys
// this is needed because we parse step by step
// so, by default, Zod would leave behind the keys from previous steps

const stepTwoSchema = z
  .object({
    [DbWizardFormFields.cpu]: resourceToNumber(0.6),
    [DbWizardFormFields.memory]: resourceToNumber(0.512),
    [DbWizardFormFields.disk]: resourceToNumber(1),
    [DbWizardFormFields.resourceSizePerNode]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfNodes]: z.string(),
  })
  .passthrough();

const backupsStepSchema = z
  .object({
    [DbWizardFormFields.schedules]: z.array(
      z.object({
        backupStorageName: z.string(),
        enabled: z.boolean(),
        name: z.string(),
        schedule: z.string(),
      })
    ),
    [DbWizardFormFields.pitrEnabled]: z.boolean(),
    [DbWizardFormFields.pitrStorageLocation]: z
      .string()
      .or(
        z.object({
          name: z.string(),
        })
      )
      .nullable()
      .optional(),
  })
  .passthrough()
  .superRefine(({ pitrEnabled, pitrStorageLocation }, ctx) => {
    if (pitrEnabled && !pitrStorageLocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [DbWizardFormFields.pitrStorageLocation],
        message: ScheduleFormMessages.storageLocation.invalidOption,
      });
    }
  });

const advancedConfigurationsSchema = z
  .object({
    [DbWizardFormFields.externalAccess]: z.boolean(),
    // internetFacing: z.boolean(),
    [DbWizardFormFields.sourceRanges]: z.array(
      z.object({ sourceRange: z.string().optional() })
    ),
    [DbWizardFormFields.engineParametersEnabled]: z.boolean(),
    [DbWizardFormFields.engineParameters]: z.string().optional(),
  })
  .passthrough()
  .superRefine(({ sourceRanges }, ctx) => {
    sourceRanges.forEach(({ sourceRange }, index) => {
      if (sourceRange && IP_REGEX.exec(sourceRange) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_string,
          validation: 'ip',
          path: [DbWizardFormFields.sourceRanges, index, 'sourceRange'],
          message: Messages.errors.sourceRange.invalid,
        });
      }
    });
  });

const stepFiveSchema = z
  .object({
    monitoring: z.boolean(),
    monitoringInstance: z.string().nullable(),
  })
  .passthrough()
  .superRefine(({ monitoring, monitoringInstance }, ctx) => {
    if (monitoring && !monitoringInstance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [DbWizardFormFields.monitoringInstance],
        message: Messages.errors.monitoringEndpoint.invalidOption,
      });
    }
  });

// Each position of the array is the validation schema for a given step
export const getDBWizardSchema = (activeStep: number) => {
  const schema = [
    basicInfoSchema,
    stepTwoSchema,
    backupsStepSchema,
    advancedConfigurationsSchema,
    stepFiveSchema,
  ];
  return schema[activeStep];
};

export type BasicInfoType = z.infer<typeof basicInfoSchema>;
export type StepTwoType = z.infer<typeof stepTwoSchema>;
export type AdvancedConfigurationType = z.infer<
  typeof advancedConfigurationsSchema
>;
export type BackupStepType = z.infer<typeof backupsStepSchema>;
export type StepFiveType = z.infer<typeof stepFiveSchema>;

export type DbWizardType = BasicInfoType &
  StepTwoType &
  StepFiveType &
  AdvancedConfigurationType &
  BackupStepType;
