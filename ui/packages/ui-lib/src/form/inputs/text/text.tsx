import { TextField } from '@mui/material';
import { kebabize } from '@percona/utils';
import { Controller, useFormContext } from 'react-hook-form';
import { TextInputProps } from './text.types';

const TextInput = ({
  control,
  name,
  label,
  controllerProps,
  textFieldProps,
  isRequired,
}: TextInputProps) => {
  const { control: contextControl } = useFormContext();
  return (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field, fieldState: { error } }) => {
        return (
          <TextField
            label={label}
            {...field}
            size={textFieldProps?.size || 'small'}
            sx={{ mt: 3 }}
            {...textFieldProps}
            variant="outlined"
            required={isRequired}
            error={!!error}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              'data-testid': `text-input-${kebabize(name)}`,
              onWheel: (e) => {
                (e.target as HTMLElement).blur();
              },
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                if (textFieldProps?.onChange) {
                  const modifiedEvent = {
                    ...event,
                    target: {
                      ...event.target,
                      value: textFieldProps.onChange(event),
                    },
                  };
                  field.onChange(modifiedEvent);
                } else {
                  field.onChange(event);
                }
              },
            }}
            helperText={error ? error.message : textFieldProps?.helperText}
          />
        );
      }}
      {...controllerProps}
    />
  );
};

export default TextInput;
