import { useState } from 'react';
import { TextInput } from '@percona/ui-lib';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { HiddenInputProps } from './hidden-input.types';
import { IconButton } from '@mui/material';

export const HiddenInput = ({
  placeholder = '',
  name,
  label,
  isRequired = true,
}: HiddenInputProps) => {
  const [showKey, setShowKey] = useState(false);
  return (
    <TextInput
      data-testid={`hidden-input-${name}`}
      textFieldProps={{
        sx: {
          marginTop: 3,
          'input::-ms-reveal': {
            display: 'none',
          },
        },
        type: showKey ? 'text' : 'password',
        placeholder: placeholder,
        InputProps: {
          endAdornment: (
            <IconButton onClick={() => setShowKey(!showKey)}>
              {showKey ? (
                <VisibilityOutlinedIcon />
              ) : (
                <VisibilityOffOutlinedIcon />
              )}
            </IconButton>
          ),
        },
      }}
      name={name}
      label={label}
      isRequired={isRequired}
    />
  );
};
