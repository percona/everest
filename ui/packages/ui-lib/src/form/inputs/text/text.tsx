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
      render={({ field, fieldState: { error } }) => (
        <TextField
          label={label}
          {...field}
          size={textFieldProps?.size|| "small"}
          sx={{ mt: 2 }}
          {...textFieldProps}
          variant="outlined"
          required={isRequired}
          error={!!error}
          InputLabelProps={{
              shrink: true,
          }}
          inputProps={{
            'data-testid': `text-input-${kebabize(name)}`,
            ...textFieldProps?.inputProps,
          }}
          helperText={error ? error.message : textFieldProps?.helperText}
        />
      )}
      {...controllerProps}
    />
  );
};

export default TextInput;
