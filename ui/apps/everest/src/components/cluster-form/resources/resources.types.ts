import { DbType } from '@percona/types';

export type ResourcesTogglesProps = {
  unit?: string;
  unitPlural?: string;
  options: string[];
  resourceSizePerUnitInputName: string;
  cpuInputName: string;
  diskInputName?: string;
  diskUnitInputName?: string;
  memoryInputName: string;
  numberOfUnitsInputName: string;
  customNrOfUnitsInputName: string;
  disableDiskInput?: boolean;
  allowDiskInputUpdate?: boolean;
  dbType: DbType;
};

export type ResourceInputProps = {
  unit: string;
  unitPlural: string;
  name: string;
  label: string;
  helperText: string;
  endSuffix: string;
  numberOfUnits: number;
  disabled?: boolean;
};
