import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { ToggleButtonGroupInputProps } from './toggle-button-group.types';
import ToggleButtonGroupInput from './toggle-button-group';
import { DbType } from '@percona/types';
import DbToggleCard from '../../../db-toggle-card';

type CustomArgs = ToggleButtonGroupInputProps & {
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  width?: string;
};

const meta = {
  title: 'ToggleButtonGroupInput',
  component: ToggleButtonGroupInput,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    label: {
      type: 'string',
    },
    disabled: {
      type: 'boolean',
    },
    size: {
      options: ['small', 'medium', 'large'],
      control: { type: 'inline-radio' },
    },
    width: {
      type: 'string',
    },
  },

  render: function Render({ label, disabled, size, width }) {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <ToggleButtonGroupInput
          name="toggle-button-group-input"
          label={label}
          toggleButtonGroupProps={{ disabled, size, sx: { width } }}
          controllerProps={{
            name: 'toggle-button-group-input',
            defaultValue: DbType.Mysql,
          }}
        >
          <DbToggleCard key={DbType.Mysql} value={DbType.Mysql} />
          <DbToggleCard key={DbType.Mongo} value={DbType.Mongo} />
          <DbToggleCard key={DbType.Postresql} value={DbType.Postresql} />
        </ToggleButtonGroupInput>
      </FormProvider>
    );
  },
} satisfies Meta<CustomArgs>;

export default meta;

type Story = StoryObj<CustomArgs>;

export const Basic: Story = {
  args: {
    label: 'Database type',
    disabled: false,
    size: 'medium',
    width: '50rem',
  },
};
