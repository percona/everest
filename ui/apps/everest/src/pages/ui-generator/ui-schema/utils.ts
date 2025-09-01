import { z } from 'zod';
import { ComponentProperties } from './types';
import { zodRuleMap } from './constants';

export const zodSchemaMap: Record<string, z.ZodTypeAny> = {
  Number: z.union([z.number(), z.string().transform((s) => parseInt(s, 10))]),
  String: z.string().min(5),
  TextArea: z.string(),
  Input: z.string(),
  Switch: z.boolean(),
  Checkbox: z.boolean(),
};

export const getDefaultValues = (
  fields: Record<string, ComponentProperties>,
  topologyKeys: string[],
  parentKey?: string
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  const defaultValueMap: Record<string, unknown> = {
    Number: 10,
    Switch: false,
    Checkbox: false,
    Toggle: false,
    TextArea: '',
    Input: '',
    StorageClassSelect: '',
    SecretSelector: '',
    String: '',
    Hidden: '',
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value.uiType === 'Group' && value.subParameters) {
      defaults[key] = getDefaultValues(value.subParameters, topologyKeys, key);
    } else {
      if (value.params?.default !== undefined) {
        defaults[key] = value.params.default;
      } else {
        defaults[key] = defaultValueMap[value.uiType] ?? '';
      }
    }
  });

  if (parentKey) {
    if (parentKey.includes('.')) {
      const keys = parentKey.split('.');
      let nested = defaults;
      for (let i = keys.length - 1; i >= 0; i--) {
        nested = { [keys[i]]: nested };
      }
      return nested;
    }
    return { [parentKey]: defaults };
  }

  return defaults;
};

export const buildZodSchema = (fields: Record<string, any>, parentKey = '') => {
  const shape: Record<string, any> = {};

  Object.entries(fields).forEach(([key, value]) => {
    if (value.uiType === 'Group' && value.subParameters) {
      shape[`${parentKey}.${key}`] = buildZodSchema(value.subParameters, '');
    } else {
      let schema = zodSchemaMap[value.uiType] ?? z.any();
      if (value.validation) {
        Object.entries(value.validation).forEach(([rule, ruleValue]) => {
          const zodMethod = zodRuleMap[rule];
          if (
            zodMethod &&
            typeof schema[zodMethod as keyof typeof schema] === 'function'
          ) {
            schema = (schema as z.ZodTypeAny)[zodMethod as keyof z.ZodTypeAny](
              ruleValue
            );
          }
        });
      }
      shape[`${parentKey}.${key}`] = schema;
    }
  });
  const obj = z.object(shape);
  if (parentKey) {
    return z.object({ [parentKey]: obj });
  }
  return obj;
};
