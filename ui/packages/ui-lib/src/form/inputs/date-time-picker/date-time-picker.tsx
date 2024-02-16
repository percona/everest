import { Controller, useFormContext } from 'react-hook-form';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { kebabize } from '@percona/utils';
import { DateTimePickerInputProps } from './date-time-picker.types';

const DateTimePickerInput = <T extends object>({
  name,
  control,
  controllerProps,
  ...dateTimePickerProps
}: DateTimePickerInputProps<T>) => {
  const { control: contextControl } = useFormContext();

  return (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field }) => (
        <DateTimePicker
          {...field}
          inputRef={field.ref}
          data-testid={`date-time-picker-${kebabize(name)}`}
          {...dateTimePickerProps}
        />
      )}
      {...controllerProps}
    />
  );
};

export default DateTimePickerInput;
