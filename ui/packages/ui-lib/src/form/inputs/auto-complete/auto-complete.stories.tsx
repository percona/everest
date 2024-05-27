import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoCompleteInput from './auto-complete';

type CustomArgs = React.ComponentProps<typeof AutoCompleteInput> & {
  error?: boolean;
  size?: 'small' | 'medium';
  width?: string;
  helperText?: string;
};

const meta = {
  title: 'AutoComplete',
  component: AutoCompleteInput,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    disabled: {
      type: 'boolean',
    },
    isRequired: {
      type: 'boolean',
    },
    loading: {
      type: 'boolean',
    },
    error: {
      type: 'boolean',
    },
    size: {
      options: ['small', 'medium'],
      control: { type: 'inline-radio' },
    },
  },

  render: function Render(args) {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <AutoCompleteInput
          textFieldProps={{
            error: args.error,
            size: args.size,
            helperText: args.helperText,
          }}
          autoCompleteProps={{
            sx: { width: args.width },
            defaultValue: args.options[0],
          }}
          name={'autocomplete'}
          label={args.label}
          options={args.options}
          disabled={args.disabled}
          loading={args.loading}
          isRequired={args.isRequired}
        />
      </FormProvider>
    );
  },
} satisfies Meta<CustomArgs>;
export default meta;

type Story = StoryObj<CustomArgs>;

export const Basic: Story = {
  args: {
    label: 'Label',
    disabled: false,
    isRequired: false,
    loading: false,
    error: false,
    size: 'small',
    options: ['First', 'Second', 'Third'],
    width: '200px',
    helperText: 'Select one of the options',
  },
};
