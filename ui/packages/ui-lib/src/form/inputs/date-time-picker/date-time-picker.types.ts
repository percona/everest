import { Control, UseControllerProps } from 'react-hook-form';
import { DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';

export interface DateTimePickerInputProps<T extends never>
  extends DateTimePickerProps<T> {
  control?: Control;
  controllerProps?: UseControllerProps;
  name: string;
}
