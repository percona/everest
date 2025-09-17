import { z } from 'zod';
import { OpenAPIFields } from './types';
import { UI_TYPE_DEFAULT_VALUE, ZOD_SCHEMA_MAP, zodRuleMap } from './constants';
import { evaluate } from '@marcbachmann/cel-js';
import { Control, useWatch } from 'react-hook-form';
import { useEffect } from 'react';

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
      params: buildDefaults(fields.global || {}),
    };
  }

  if (fields.components) {
    defaults.components = {};
    Object.entries(fields.components).forEach(([compName, compValue]) => {
      defaults.components[compName] = buildDefaults(compValue || {});
    });
  }

  if (fields.topology) {
    defaults.topology = buildDefaults(fields.topology || {});
    defaults.topology.type = Object.keys(fields.topology)[0];
  }

  return defaults;
};

export const buildZodSchema = (
  fields: Record<string, any>,
  parentKey = ''
): { schema: z.ZodTypeAny; celDependencyGroups: string[][] } => {
  const celExpValidations: { path: string[]; celExpr: string }[] = [];
  const celDependencyGroups: string[][] = [];

  const buildShape = (
    obj: Record<string, any>,
    path: string[] = []
  ): z.ZodTypeAny => {
    const schemaShape: Record<string, z.ZodTypeAny> = {};
    Object.entries(obj).forEach(([key, value]) => {
      let fieldSchema: z.ZodTypeAny;
      if (value.uiType === 'Group' && value.subParameters) {
        fieldSchema = buildShape(value.subParameters, [...path, key]);
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
          if (value.validation.celExpr) {
            const deps = extractCelFieldPaths(value.validation.celExpr).map(
              (p) => p.join('.')
            );
            celDependencyGroups.push(deps);
            celExpValidations.push({
              path: [...path, key],
              celExpr: value.validation.celExpr,
            });
          }
        }
      }
      schemaShape[key] = fieldSchema;
    });
    return z.object(schemaShape);
  };

  let schema = buildShape(fields);

  let fieldPath: string[] = [];
  if (parentKey) {
    if (parentKey.includes('.')) {
      const keys = parentKey.split('.');
      fieldPath = keys;
      for (let i = keys.length - 1; i >= 0; i--) {
        schema = z.object({ [keys[i]]: schema });
      }
    } else {
      fieldPath = [parentKey];
      schema = z.object({ [parentKey]: schema });
    }
  }

  if (celExpValidations.length > 0) {
    schema = schema.superRefine((data, ctx) => {
      celExpValidations.forEach(({ path, celExpr }) => {
        const fullPath = [...fieldPath, ...path];
        const referencedFields = extractCelFieldPaths(celExpr);
        try {
          const result = evaluate(celExpr, data);
          if (!result) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `CEL validation failed: ${celExpr}`,
              path: fullPath,
            });
            // add error to referenced fields
            referencedFields.forEach((refPath) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Validation failed: ${celExpr}`,
                path: refPath,
              });
            });
          }
        } catch (e) {
          console.log(`Validation error: ${e}`);
        }
      });
    });
  }

  return {
    schema,
    celDependencyGroups,
  };
};

export const extractCelFieldPaths = (celExpr: string): string[][] => {
  const regex = /([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)/g;
  const matches = celExpr.match(regex) || [];
  return Array.from(new Set(matches)).map((f) => f.split('.'));
};

export function useTriggerDependentFields(
  groups: string[][],
  control: Control<Record<string, unknown>, unknown>,
  trigger: (fields: string[]) => void
) {
  const watchedNames = Array.from(new Set(groups.flat()));
  const watchedValues = useWatch({ control, name: watchedNames });

  useEffect(() => {
    groups.forEach((group) => {
      trigger(group);
    });
  }, [JSON.stringify(watchedValues)]);
}
