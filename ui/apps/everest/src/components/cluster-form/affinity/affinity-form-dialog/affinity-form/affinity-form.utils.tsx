import { generateShortUID } from 'utils/generateShortUID';
import { AffinityFormData, AffinityFormFields } from './affinity-form.types';
import { AffinityRule } from 'shared-types/affinity.types';

export const convertFormDataToAffinityRule = (
  data: AffinityFormData
): AffinityRule => {
  return {
    component: data[AffinityFormFields.component],
    type: data[AffinityFormFields.type],
    priority: data[AffinityFormFields.priority],
    key: data[AffinityFormFields.key],
    topologyKey: data[AffinityFormFields.topologyKey],
    weight: data[AffinityFormFields.weight],
    operator: data[AffinityFormFields.operator],
    values: data[AffinityFormFields.values],
    uid: generateShortUID(),
  };
};
