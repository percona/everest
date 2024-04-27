import { MenuItem } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import SelectInput from './select';

type CustomArgs = React.ComponentProps<typeof SelectInput> & {
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  size?: 'small' | 'medium';
  options?: string[];
  width?: string;
};

const meta = {
  title: 'Select',
  component: SelectInput,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    disabled: {
      options: [false, true],
      control: { type: 'inline-radio' },
    },
    error: {
      options: [false, true],
      control: { type: 'inline-radio' },
    },
    required: {
      options: [false, true],
      control: { type: 'inline-radio' },
    },
    size: {
      options: ['small', 'medium'],
      control: { type: 'inline-radio' },
    },
  },

  render: function Render({
    disabled,
    error,
    required,
    size,
    options,
    width,
    ...args
  }) {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <SelectInput
          selectFieldProps={{
            error,
          }}
          formControlProps={{
            sx: { width },
            disabled,
            required,
            size,
          }}
          name={'select'}
          label={args.label}
        >
          {options?.map((item) => <MenuItem value={item}>{item}</MenuItem>)}
        </SelectInput>
      </FormProvider>
    );
  },
} satisfies Meta<CustomArgs>;
export default meta;

type Story = StoryObj<CustomArgs>;

export const Basic: Story = {
  args: {
    label: 'Select',
    disabled: false,
    error: false,
    required: false,
    size: 'small',
    options: ['First', 'Second', 'Third'],
    width: '200px',
  },
};
