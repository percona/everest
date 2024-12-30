import { AffinityFormData, AffinityFormFields } from './affinity-form.types';

export const getAffinityPayload = (data: AffinityFormData) => {
  return {
    component: data[AffinityFormFields.component],
    type: data[AffinityFormFields.type],
    priority: data[AffinityFormFields.priority],
    key: data[AffinityFormFields.key],
    topologyKey: data[AffinityFormFields.topologyKey],
    weight: 1, // TODO: get from form,
    operator: data[AffinityFormFields.operator],
    values: data[AffinityFormFields.values],
  };
};
