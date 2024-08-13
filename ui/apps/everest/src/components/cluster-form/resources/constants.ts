import { DbType } from '@percona/types';
import { z } from 'zod';
import { DbCluster } from 'shared-types/dbCluster.types';
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
  dbCluster: DbCluster
): ResourceSize => {
  const resources = dbCluster?.spec?.engine?.resources;

  if (!resources) {
    return ResourceSize.custom;
  }

  const size = memoryParser(dbCluster?.spec?.engine?.storage?.size.toString());
  const memory = memoryParser(resources.memory.toString());

  const res = Object.values(DEFAULT_SIZES).findIndex(
    (item) =>
      item.cpu === Number(resources.cpu) &&
      item.memory === memory &&
      item.disk === size
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
  };

  const zObject = passthrough
    ? z.object(objectShape).passthrough()
    : z.object(objectShape);

  return zObject.superRefine(({ numberOfNodes, customNrOfNodes = '' }, ctx) => {
    if (numberOfNodes !== CUSTOM_NODES_NR_INPUT_VALUE) {
      return;
    }

    const intNumberOfNodes = parseInt(customNrOfNodes, 10);

    if (Number.isNaN(intNumberOfNodes) || intNumberOfNodes < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid number of nodes',
        path: [DbWizardFormFields.customNrOfNodes],
      });
    }
  });
};

export const CUSTOM_NODES_NR_INPUT_VALUE = 'custom-nr-nodes';
