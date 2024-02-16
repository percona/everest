import { AutoCompleteInputProps } from '@percona/ui-lib';
export type AutoCompleteSelectAllTypes<T> = AutoCompleteInputProps<T> & {
  options: string[] | T[];
  optionLabelName?: string;
};
