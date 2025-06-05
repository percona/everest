import {
  AffinityComponent,
  AffinityOperator,
  AffinityPriority,
  AffinityRule,
  AffinityType,
} from 'shared-types/affinity.types';
import {
  AffinityFormData,
  AffinityFormFields,
} from './affinity-form/affinity-form.types';

export const affinityModalDefaultValues = (
  selectedRule?: AffinityRule
): AffinityFormData => {
  if (selectedRule) {
    const {
      component,
      type,
      priority,
      weight,
      topologyKey,
      key,
      operator,
      values,
    } = selectedRule;
    return {
      [AffinityFormFields.component]: component,
      [AffinityFormFields.type]: type,
      [AffinityFormFields.priority]: priority,
      [AffinityFormFields.weight]: parseInt(weight?.toString() || '1', 10),
      [AffinityFormFields.topologyKey]: topologyKey || '',
      [AffinityFormFields.key]: key || '',
      [AffinityFormFields.operator]: operator || ('' as AffinityOperator),
      [AffinityFormFields.values]: values,
    };
  }
  return {
    [AffinityFormFields.component]: AffinityComponent.DbNode,
    [AffinityFormFields.type]: AffinityType.PodAntiAffinity,
    [AffinityFormFields.priority]: AffinityPriority.Preferred,
    [AffinityFormFields.weight]: 1,
    [AffinityFormFields.topologyKey]: 'kubernetes.io/hostname',
    [AffinityFormFields.key]: '',
    [AffinityFormFields.operator]: '' as AffinityOperator,
    [AffinityFormFields.values]: '',
  };
};
