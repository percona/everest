import { TextField } from '@mui/material';
import { kebabize } from '@percona/utils';
import { Controller, useFormContext } from 'react-hook-form';
import { TextInputProps } from './text.types';

const TextInput = ({
  control,
  name,
  label,
  controllerProps,
  textFieldProps = {},
  isRequired,
}: TextInputProps) => {
  const { control: contextControl } = useFormContext();
  const { sx: textFieldPropsSx, ...restFieldProps } = textFieldProps;
  return (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field, fieldState: { error } }) => (
        <TextField
          label={label}
          {...field}
          size={restFieldProps?.size || 'small'}
          sx={{ mt: 3, ...textFieldPropsSx }}
          {...restFieldProps}
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
            ...restFieldProps?.inputProps,
          }}
          helperText={error ? error.message : restFieldProps?.helperText}
        />
      )}
      {...controllerProps}
    />
  );
};

export default TextInput;
