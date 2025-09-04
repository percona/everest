import { z } from 'zod';
import { OpenAPIFields } from './types';
import { UI_TYPE_DEFAULT_VALUE, ZOD_SCHEMA_MAP, zodRuleMap } from './constants';

export const getDefaultValues = (
  fields: OpenAPIFields
): Record<string, unknown> => {
  const buildDefaults = (obj: Record<string, any>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value.uiType === 'Group' && value.subParameters) {
        result[key] = buildDefaults(value.subParameters);
      } else {
        if (value.params?.default !== undefined) {
          result[key] = value.params.default;
        } else {
          result[key] = value.uiType
            ? (UI_TYPE_DEFAULT_VALUE[value.uiType] ?? '')
            : '';
        }
      }
    });
    return result;
  };

  const defaults: Record<string, any> = {};

  if (fields.global) {
    defaults.global = {
      params: buildDefaults(fields.global.properties || {}),
    };
  }

  if (fields.components) {
    defaults.components = {};
    Object.entries(fields.components).forEach(([compName, compValue]) => {
      defaults.components[compName] = buildDefaults(compValue.properties || {});
    });
  }

  if (fields.topology) {
    defaults.topology = Object.keys(fields.topology)[0];
    defaults.topology = buildDefaults(fields.topology.properties || {});
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
      fieldSchema = ZOD_SCHEMA_MAP[value.uiType] ?? z.any();
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
