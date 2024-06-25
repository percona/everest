import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';

import TextInput from './text';
import { TextInputProps } from './text.types';
import { Box } from '@mui/material';

type ExpandedTextInputProps = TextInputProps & {
  readOnly?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  error?: boolean;
  minRows?: number;
  size?: 'small' | 'medium';
  multiline: boolean;
};

const meta = {
  title: 'TextInput',
  component: TextInput,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      options: ['small', 'medium'],
      control: { type: 'radio' },
    },
    type: {
      options: ['email', 'password', 'number', 'text', 'tel', 'url'],
      control: 'select',
    },
    multiline: {
      table: {
        disable: true,
      },
    },
    error: {
      table: {
        disable: true,
      },
    },
  },
  render: function Render({
    label,
    readOnly,
    size,
    placeholder,
    minRows,
    multiline,
    type,
    maxLength,
    error,
    ...args
  }) {
    const methods = useForm();
    if (error) {
      methods.setError('error', { message: 'Please insert a valid value' });
    } else {
      methods.clearErrors('error');
    }

    return (
      <FormProvider {...methods}>
        <Box
          sx={{
            '& .MuiTextField-root': {
              display: 'flex',
              m: 5,
            },
          }}
        >
          <TextInput
            {...args}
            name="TextInput"
            label={type ? 'TextInput.' + ' Type: ' + type : 'TextInput'}
            textFieldProps={{
              placeholder,
              size,
              multiline,
              minRows,
              type,
              inputProps: {
                readOnly,
                maxLength,
              },
            }}
          />

          <TextInput
            {...args}
            name="disabled"
            label={label + '. Disabled'}
            textFieldProps={{
              placeholder,
              disabled: true,
              size,
              multiline,
              minRows,
              inputProps: {
                readOnly,
                maxLength,
              },
            }}
          />

          <TextInput
            {...args}
            name="error"
            label={label + '. Error'}
            textFieldProps={{
              placeholder,
              size,
              multiline,
              minRows,
              inputProps: {
                readOnly,
                maxLength,
              },
            }}
          />
        </Box>
      </FormProvider>
    );
  },
} satisfies Meta<ExpandedTextInputProps>;

export default meta;
type Story = StoryObj<Meta>;

export const TextField: Story = {
  argTypes: {},
  args: {
    label: 'TextInput',
    placeholder: 'Placeholder',
    maxLength: 8,
    size: 'small',
    type: 'password',
    error: true,
    readOnly: false,
    isRequired: false,
    multiline: false,
  },
};

export const TextArea: Story = {
  argTypes: {
    type: {
      table: {
        disable: true,
      },
    },
  },
  args: {
    label: 'TextArea',
    placeholder: 'Placeholder',
    maxLength: 8,
    size: 'small',
    error: true,
    readOnly: false,
    isRequired: false,
    multiline: true,
    minRows: 3,
  },
};
