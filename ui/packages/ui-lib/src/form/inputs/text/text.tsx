import { TextField } from '@mui/material';
import { kebabize } from '@percona/utils';
import { Controller, useFormContext } from 'react-hook-form';
import { TextInputProps } from './text.types';
import LabeledContent from '../../../labeled-content';

const TextInput = ({
  control,
  name,
  label,
  controllerProps,
  labelProps,
  textFieldProps,
  isRequired = false,
}: TextInputProps) => {
  const { control: contextControl } = useFormContext();
  const content = (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...textFieldProps}
          variant="outlined"
          error={!!error}
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

  return label ? (
    <LabeledContent label={label} isRequired={isRequired} {...labelProps}>
      {content}
    </LabeledContent>
  ) : (
    content
  );
};

export default TextInput;
