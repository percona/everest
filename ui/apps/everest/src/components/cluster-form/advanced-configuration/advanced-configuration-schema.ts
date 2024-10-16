import { z } from 'zod';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { IP_REGEX } from 'consts';
import { Messages } from './messages';

export const advancedConfigurationsSchema = z
  .object({
    [AdvancedConfigurationFields.externalAccess]: z.boolean(),
    // internetFacing: z.boolean(),
    [AdvancedConfigurationFields.sourceRanges]: z.array(
      z.object({ sourceRange: z.string().optional() })
    ),
    [AdvancedConfigurationFields.engineParametersEnabled]: z.boolean(),
    [AdvancedConfigurationFields.engineParameters]: z.string().optional(),
  })
  .passthrough()
  .superRefine(({ sourceRanges }, ctx) => {
    sourceRanges.forEach(({ sourceRange }, index) => {
      if (sourceRange && IP_REGEX.exec(sourceRange) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_string,
          validation: 'ip',
          path: [
            AdvancedConfigurationFields.sourceRanges,
            index,
            'sourceRange',
          ],
          message: Messages.errors.sourceRange.invalid,
        });
      }
    });
  });

export type AdvancedConfigurationFormType = z.infer<
  typeof advancedConfigurationsSchema
>;
