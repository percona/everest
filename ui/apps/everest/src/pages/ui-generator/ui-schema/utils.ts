import { z } from 'zod';
import { ComponentProperties } from './types';
import { zodRuleMap } from './constants';

export const zodSchemaMap: Record<string, z.ZodTypeAny> = {
  Number: z.number(),
  String: z.string().min(5),
  TextArea: z.string().min(5),
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
      defaults[key] = getDefaultValues(value.subParameters, topologyKeys);
    } else {
      if (value.params?.default !== undefined) {
        defaults[key] = value.params.default;
      } else {
        defaults[key] = value.uiType
          ? (defaultValueMap[value.uiType] ?? '')
          : '';
      }
    }
  });

  if (parentKey) {
    const keys = parentKey.split('.');
    let nested = defaults;
    for (let i = keys.length - 1; i >= 0; i--) {
      nested = { [keys[i]]: nested };
    }
    return nested;
  }

  return defaults;
};

export const buildZodSchema = (fields: Record<string, any>, parentKey = '') => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  Object.entries(fields).forEach(([key, value]) => {
    let fieldSchema: z.ZodTypeAny;

    if (value.uiType === 'Group' && value.subParameters) {
      fieldSchema = buildZodSchema(value.subParameters);
    } else {
      fieldSchema = zodSchemaMap[value.uiType] ?? z.any();
      if (value.validation) {
        Object.entries(value.validation).forEach(([rule, ruleValue]) => {
          const zodMethod = zodRuleMap[rule];
          if (
            zodMethod &&
            typeof fieldSchema[zodMethod as keyof typeof fieldSchema] ===
              'function'
          ) {
            fieldSchema = (fieldSchema as z.ZodTypeAny)[
              zodMethod as keyof z.ZodTypeAny
            ](ruleValue);
          }
        });
      }
    }

    schemaShape[key] = fieldSchema;
  });

  let schema = z.object(schemaShape);

  if (parentKey) {
    if (parentKey.includes('.')) {
      const keys = parentKey.split('.');
      for (let i = keys.length - 1; i >= 0; i--) {
        schema = z.object({ [keys[i]]: schema });
      }
    } else {
      schema = z.object({ [parentKey]: schema });
    }
  }

  return schema;
};
