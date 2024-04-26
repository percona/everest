import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';

import TextInput from './text';
import { TextInputProps } from './text.types';

type ExpandedTextInputProps = TextInputProps & {
  readOnly?: boolean,
  type?: string, 
  maxLength?: number, 
  value?: string,
  placeholder?: string,
  error?: boolean,
  disabled?: boolean,
  minRows?: number,
  size?: "small" | "medium", 
}

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
      control: 'select'
    },
  },
  render: function Render({
    readOnly,
    size,
    disabled,
    placeholder,
    minRows,
    type,
    maxLength,
    error,
    ...args
  }) {
    const methods = useForm();
    if(error) {
      methods.setError('TextField', {message: 'Please insert a valid value'});
    } else {
      methods.clearErrors('TextField');
    }

    return (
      <FormProvider {...methods}>
        <TextInput
          {...args}
          textFieldProps={{
            placeholder,
            disabled,
            size,
            multiline: true,
            minRows,
            inputProps: {
              readOnly, 
              maxLength
            }
          }}
        />

        <TextInput
          {...args}
          textFieldProps={{
            type,
            placeholder,
            disabled,
            size,
            inputProps: {
              readOnly, 
              maxLength,
            }
          }}
        />
      </FormProvider>
    );
  },
} satisfies Meta<ExpandedTextInputProps>;

export default meta;
type Story = StoryObj<Meta>;

export const Basic: Story = {
  args: {
    name: 'TextField',
    label: 'Label',
    placeholder: 'Placeholder',
    maxLength: 8,
    size: 'small',
    disabled: false,
    type: 'password',
    error: false,
    readOnly: false,
    isRequired: false,
    minRows: 3,
  },
}