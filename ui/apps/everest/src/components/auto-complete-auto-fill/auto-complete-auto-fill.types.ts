import { AutoCompleteInputProps } from '@percona/ui-lib';

export type AutoCompleteAutoFillProps<T> = AutoCompleteInputProps<T> & {
  enableFillFirst?: boolean;
  fillFirstField?: string;
};
