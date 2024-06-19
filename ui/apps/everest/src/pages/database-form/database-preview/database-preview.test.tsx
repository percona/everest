import React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { DbType } from '@percona/types';
import { DB_WIZARD_DEFAULTS } from '../database-form.constants';
import { TestWrapper } from 'utils/test';
import { DatabasePreview } from './database-preview';
import { DbWizardType } from '../database-form-schema.ts';

const FormProviderWrapper = ({
  children,
  values = {},
}: {
  children: React.ReactNode;
  values?: Partial<DbWizardType>;
}) => {
  const methods = useForm<DbWizardType>({
    // @ts-ignore
    defaultValues: { ...DB_WIZARD_DEFAULTS, ...values },
  });

  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
};

describe('DatabasePreview', () => {
  it('should show all sections', () => {
    render(
      <FormProviderWrapper>
        <TestWrapper>
          <DatabasePreview activeStep={0} longestAchievedStep={0} />
        </TestWrapper>
      </FormProviderWrapper>
    );

    expect(screen.getAllByTestId(/^section-*/, { exact: false })).toHaveLength(
      5
    );
  });

  it('should show values from form', () => {
    render(
      <FormProviderWrapper
        values={{
          dbName: 'myDB',
          dbType: DbType.Mysql,
          dbVersion: '1.0.0',
        }}
      >
        <TestWrapper>
          <DatabasePreview activeStep={0} longestAchievedStep={0} />
        </TestWrapper>
      </FormProviderWrapper>
    );

    expect(screen.getByText('Name: myDB')).toBeInTheDocument();
    expect(screen.getByText('Type: MySQL')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();

    expect(screen.queryByText('Number of nodes: 1')).not.toBeInTheDocument();
  });

  it('should show values from previous steps', () => {
    render(
      <FormProviderWrapper
        values={{
          dbName: 'myDB',
          dbType: DbType.Mysql,
          dbVersion: '1.0.0',
          disk: 30,
        }}
      >
        <TestWrapper>
          <DatabasePreview activeStep={1} longestAchievedStep={1} />
        </TestWrapper>
      </FormProviderWrapper>
    );

    expect(screen.getByText('Name: myDB')).toBeInTheDocument();
    expect(screen.getByText('Type: MySQL')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();

    expect(screen.getByText('Number of nodes: 1')).toBeInTheDocument();
    expect(screen.getByText('CPU: 1 CPU')).toBeInTheDocument();
    expect(screen.getByText('Disk: 30 GB')).toBeInTheDocument();
  });

  it('should get updated form values', async () => {
    const FormConsumer = () => {
      const { setValue } = useFormContext();

      return (
        <button
          aria-label="Change DB name"
          type="button"
          data-testid="change-db-name"
          onClick={() => setValue('dbName', 'myNewDB')}
        />
      );
    };

    render(
      <FormProviderWrapper
        values={{
          dbName: 'myDB',
          dbType: DbType.Mysql,
          dbVersion: '1.0.0',
          disk: 30,
        }}
      >
        <TestWrapper>
          <FormConsumer />
          <DatabasePreview activeStep={1} longestAchievedStep={1} />
        </TestWrapper>
      </FormProviderWrapper>
    );

    expect(screen.getByText('Name: myDB')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('change-db-name'));

    await waitFor(() =>
      expect(screen.getByText('Name: myNewDB')).toBeInTheDocument()
    );

    expect(screen.queryByText('Name: myDB')).not.toBeInTheDocument();
  });
});
