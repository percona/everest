import { z } from 'zod';
import { DbType } from '@percona/types';
import { IP_REGEX, MAX_DB_CLUSTER_NAME_LENGTH } from '../../consts.ts';
import { Messages } from './database-form.messages.ts';
import { ResourceSize } from './database-form-body/steps/resources/resources-step.types.ts';
import { DbWizardFormFields } from './database-form.types.ts';
import { rfc_123_schema } from 'utils/common-validation.ts';
import { Messages as ScheduleFormMessages } from 'components/schedule-form-dialog/schedule-form/schedule-form.messages.ts';
import { SHARDING_DEFAULTS } from './database-form.constants';

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
    [DbWizardFormFields.sharding]: z.boolean(),
  })
  .passthrough();

// .passthrough tells Zod to not drop unrecognized keys
// this is needed because we parse step by step
// so, by default, Zod would leave behind the keys from previous steps

const stepTwoSchema = z
  .object({
    [DbWizardFormFields.shardNr]: z.string().optional(),
    [DbWizardFormFields.shardConfigServers]: z.string().optional(),
    [DbWizardFormFields.cpu]: resourceToNumber(0.6),
    [DbWizardFormFields.memory]: resourceToNumber(0.512),
    [DbWizardFormFields.disk]: resourceToNumber(1),
    // we will never input this, but we need it and zod will let it pass
    [DbWizardFormFields.diskUnit]: z.string(),
    [DbWizardFormFields.resourceSizePerNode]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfNodes]: z.string(),
  })
  .passthrough()
  .superRefine(({ sharding, shardNr = '', shardConfigServers = '' }, ctx) => {
    if (sharding) {
      const intShardNr = parseInt(shardNr, 10);
      const intShardNrMin = +SHARDING_DEFAULTS[DbWizardFormFields.shardNr].min;
      const intShardConfigServers = parseInt(shardConfigServers, 10);
      const intShardConfigServersMin =
        +SHARDING_DEFAULTS[DbWizardFormFields.shardNr].min;
      const intShardConfigServersMax =
        +SHARDING_DEFAULTS[DbWizardFormFields.shardConfigServers].max;

      if (Number.isNaN(intShardNr) || intShardNr < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: Messages.errors.sharding.invalid,
          path: [DbWizardFormFields.shardNr],
        });
      } else {
        if (intShardNr < intShardNrMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.sharding.min(intShardNrMin),
            path: [DbWizardFormFields.shardNr],
          });
        }
      }

      if (Number.isNaN(intShardConfigServers) || intShardConfigServers <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: Messages.errors.sharding.invalid,
          path: [DbWizardFormFields.shardConfigServers],
        });
      } else {
        if (intShardConfigServers < intShardConfigServersMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.sharding.min(intShardConfigServersMin),
            path: [DbWizardFormFields.shardConfigServers],
          });
        } else if (!(intShardConfigServers % 2)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.sharding.odd,
            path: [DbWizardFormFields.shardConfigServers],
          });
        } else if (intShardConfigServers > intShardConfigServersMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.sharding.max(intShardConfigServersMax),
            path: [DbWizardFormFields.shardConfigServers],
          });
        }
      }
    }
  });

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
