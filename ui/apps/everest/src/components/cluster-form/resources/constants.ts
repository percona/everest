import { DbType } from '@percona/types';
import { DbWizardFormFields } from 'consts';

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
