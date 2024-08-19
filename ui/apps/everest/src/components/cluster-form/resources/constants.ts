import { DbType } from '@percona/types';
import { z } from 'zod';
import { Resources } from 'shared-types/dbCluster.types';
import { DbWizardFormFields } from 'consts';
import { memoryParser } from 'utils/k8ResourceParser';

const resourceToNumber = (minimum = 0) =>
  z.union([z.string().min(1), z.number()]).pipe(
    z.coerce
      .number({
        invalid_type_error: 'Please enter a valid number',
      })
      .min(minimum)
  );

export const matchFieldsValueToResourceSize = (
  resources?: Resources,
  storageSize?: number
): ResourceSize => {
  if (!resources) {
    return ResourceSize.custom;
  }
  const memory = memoryParser(resources.memory.toString());

  const res = Object.values(DEFAULT_SIZES).findIndex(
    (item) =>
      item.cpu === Number(resources.cpu) &&
      item.memory === memory &&
      item.disk === storageSize
  );
  return res !== -1
    ? (Object.keys(DEFAULT_SIZES)[res] as ResourceSize)
    : ResourceSize.custom;
};

export const NODES_DB_TYPE_MAP: Record<DbType, string[]> = {
  [DbType.Mongo]: ['1', '3', '5'],
  [DbType.Mysql]: ['1', '3', '5'],
  [DbType.Postresql]: ['1', '2', '3'],
};

export enum ResourceSize {
  small = 'small',
  medium = 'medium',
  large = 'large',
  custom = 'custom',
}

export const humanizedResourceSizeMap: Record<ResourceSize, string> = {
  [ResourceSize.small]: 'Small',
  [ResourceSize.medium]: 'Medium',
  [ResourceSize.large]: 'Large',
  [ResourceSize.custom]: 'Custom',
};

export const DEFAULT_SIZES = {
  [ResourceSize.small]: {
    [DbWizardFormFields.cpu]: 1,
    [DbWizardFormFields.memory]: 2,
    [DbWizardFormFields.disk]: 25,
  },
  [ResourceSize.medium]: {
    [DbWizardFormFields.cpu]: 4,
    [DbWizardFormFields.memory]: 8,
    [DbWizardFormFields.disk]: 100,
  },
  [ResourceSize.large]: {
    [DbWizardFormFields.cpu]: 8,
    [DbWizardFormFields.memory]: 32,
    [DbWizardFormFields.disk]: 200,
  },
};

export const resourcesFormSchema = (passthrough?: boolean) => {
  const objectShape = {
    [DbWizardFormFields.cpu]: resourceToNumber(0.6),
    [DbWizardFormFields.memory]: resourceToNumber(0.512),
    [DbWizardFormFields.disk]: resourceToNumber(1),
    [DbWizardFormFields.resourceSizePerNode]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfNodes]: z.string(),
    [DbWizardFormFields.customNrOfNodes]: z.string().optional(),
    [DbWizardFormFields.proxyCpu]: resourceToNumber(0.6),
    [DbWizardFormFields.proxyMemory]: resourceToNumber(0.512),
    [DbWizardFormFields.resourceSizePerProxy]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfProxies]: z.string(),
    [DbWizardFormFields.customNrOfProxies]: z.string().optional(),
  };

  const zObject = passthrough
    ? z.object(objectShape).passthrough()
    : z.object(objectShape);

  return zObject.superRefine(
    (
      {
        numberOfNodes,
        numberOfProxies,
        customNrOfNodes = '',
        customNrOfProxies = '',
      },
      ctx
    ) => {
      [
        [numberOfNodes, customNrOfNodes, DbWizardFormFields.customNrOfNodes],
        [
          numberOfProxies,
          customNrOfProxies,
          DbWizardFormFields.customNrOfProxies,
        ],
      ].forEach(([nr, customNr, path]) => {
        if (nr === CUSTOM_NR_UNITS_INPUT_VALUE) {
          const intNr = parseInt(customNr, 10);

          if (Number.isNaN(intNr) || intNr < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Please enter a valid number',
              path: [path],
            });
          }
        }
      });
    }
  );
};

export const CUSTOM_NR_UNITS_INPUT_VALUE = 'custom-units-nr';
