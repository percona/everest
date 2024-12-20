import {
  AffinityComponent,
  AffinityPriority,
  AffinityRule,
  AffinityType,
} from 'components/cluster-form/advanced-configuration/advanced-configuration.types';
import {
  AffinityFormData,
  AffinityFormFields,
} from 'components/affinity/affinity-form-dialog/affinity-form/affinity-form.types';

export const affinityModalDefaultValues = (
  mode: 'new' | 'edit',
  selectedRule?: AffinityRule
): AffinityFormData => {
  if (mode === 'edit' && selectedRule) {
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
      [AffinityFormFields.weight]: weight || 1,
      [AffinityFormFields.topologyKey]: topologyKey || '',
      [AffinityFormFields.key]: key || '',
      [AffinityFormFields.operator]: operator,
      [AffinityFormFields.values]: values,
    };
  }
  return {
    [AffinityFormFields.component]: AffinityComponent.DbNode,
    [AffinityFormFields.type]: AffinityType.PodAntiAffinity,
    [AffinityFormFields.priority]: AffinityPriority.Preferred,
    [AffinityFormFields.weight]: 1,
    [AffinityFormFields.topologyKey]: 'kubernetes.io/hostname',
  };
};
