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

export const affinityFormSchema = () =>
  z.object({
    [AffinityFormFields.component]: z.string().min(1),
    [AffinityFormFields.type]: z.string().min(1),
    [AffinityFormFields.priority]: z.string().min(1),
    [AffinityFormFields.weight]: z.union([z.string().min(1), z.number()]),
    [AffinityFormFields.topologyKey]: z.string().optional(),
    [AffinityFormFields.key]: z.string().optional(),
    [AffinityFormFields.operator]: z.string().optional(),
    [AffinityFormFields.values]: z.string().optional(),
  });

export type AffinityFormData = z.infer<ReturnType<typeof affinityFormSchema>>;
