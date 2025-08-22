import {
  AffinityComponent,
  AffinityOperator,
  AffinityPriority,
  AffinityType,
} from 'shared-types/affinity.types';
import { PerconaZodCustomIssue } from 'utils/common-validation';
import { doesAffinityOperatorRequireValues } from 'utils/db';
import { z } from 'zod';

enum AffinityForm {
  component = 'component',
  type = 'type',
  priority = 'priority',
  weight = 'weight',
  topologyKey = 'topologyKey',
  key = 'key',
  operator = 'operator',
  values = 'values',
}

export const AffinityFormFields = AffinityForm;
const keys = ['', ...Object.keys(AffinityOperator)] as [string, ...string[]];

const baseSchema = z.object({
  [AffinityFormFields.component]: z.nativeEnum(AffinityComponent),
  [AffinityFormFields.type]: z.nativeEnum(AffinityType),
  [AffinityFormFields.priority]: z.nativeEnum(AffinityPriority),
  [AffinityFormFields.weight]: z
    .union([z.number(), z.string().transform((s) => parseInt(s, 10))])
    .optional(),
  [AffinityFormFields.topologyKey]: z.string().optional(),
  [AffinityFormFields.key]: z.string().optional(),
  [AffinityFormFields.operator]: z.enum(keys).optional(),
  [AffinityFormFields.values]: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ''))
    .optional(),
});

const checkValuesPresenceForOperator = (
  ctx: z.RefinementCtx,
  operator: AffinityOperator,
  values: string | undefined
) => {
  if (
    doesAffinityOperatorRequireValues(operator as AffinityOperator) &&
    !values
  ) {
    ctx.addIssue(PerconaZodCustomIssue.required(AffinityFormFields.values));
  }
};

// Zod won't validate until all form is filled, so we call preprocess in advance
export const affinityFormSchema = z.preprocess((input, ctx) => {
  const { data } = baseSchema.safeParse(input);
  if (data) {
    const { type, priority, weight, topologyKey, key, operator, values } = data;

    if (
      priority === AffinityPriority.Preferred &&
      (weight === undefined || !(weight >= 1 && weight <= 100))
    ) {
      ctx.addIssue(
        PerconaZodCustomIssue.between(AffinityFormFields.weight, 1, 100)
      );
    }

    if (type === AffinityType.NodeAffinity) {
      // Key and Operator are required
      if (!key || !operator) {
        [AffinityFormFields.key, AffinityFormFields.operator].forEach(
          (field) => {
            if (!data[field]) {
              ctx.addIssue(PerconaZodCustomIssue.required(field));
            }
          }
        );
      } else {
        checkValuesPresenceForOperator(
          ctx,
          operator as AffinityOperator,
          values
        );
      }
    } else {
      if (!topologyKey) {
        ctx.addIssue(
          PerconaZodCustomIssue.required(
            AffinityFormFields.topologyKey,
            'Topology Key'
          )
        );
      }

      // Key and Operator are optional
      // If key is set, operator is required
      if (key) {
        if (!operator) {
          ctx.addIssue(
            PerconaZodCustomIssue.required(AffinityFormFields.operator)
          );
        } else {
          checkValuesPresenceForOperator(
            ctx,
            operator as AffinityOperator,
            values
          );
        }
      }
    }
  }

  return input;
}, baseSchema);

export type AffinityFormData = z.infer<typeof affinityFormSchema>;
