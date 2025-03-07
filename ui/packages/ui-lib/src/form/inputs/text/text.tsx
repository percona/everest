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
  onValueChange,
}: TextInputProps) => {
  const { control: contextControl } = useFormContext();
  return (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field: { onChange, ...field }, fieldState: { error } }) => {
        const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange((onValueChange && onValueChange(event)) ?? event.target.value); 
        };
       return <TextField
          label={label}
          {...field}
          size={textFieldProps?.size || 'small'}
          sx={{ mt: 3 }}
          {...textFieldProps}
          onChange={handleChange}
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
            ...textFieldProps?.inputProps,
          }}
          helperText={error ? error.message : textFieldProps?.helperText}
        />
      }}
      {...controllerProps}
    />
  );
};

export default TextInput;
