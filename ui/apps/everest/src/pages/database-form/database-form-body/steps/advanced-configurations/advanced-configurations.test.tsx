import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { AdvancedConfigurations } from './advanced-configurations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { advancedConfigurationsSchema } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
import { ExposureMethod } from 'components/cluster-form/advanced-configuration/advanced-configuration.types';
import { DbWizardType } from 'pages/database-form/database-form-schema';

const queryClient = new QueryClient();

const FormProviderWrapper = ({
  children,
  values,
}: {
  children: React.ReactNode;
  values?: Partial<DbWizardType>;
}) => {
  const methods = useForm({
    mode: 'onChange',
    resolver: zodResolver(advancedConfigurationsSchema()),
    defaultValues: {
      storageClass: 'standard',
      engineParametersEnabled: false,
      podSchedulingPolicyEnabled: false,
      exposureMethod: 'Cluster IP',
      sourceRanges: [
        {
          sourceRange: '192.168.1.1',
        },
      ],
      ...values,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(vi.fn())}>{children}</form>
    </FormProvider>
  );
};

describe('FourthStep', () => {
  it('should show an error message when duplicate sourceRanges are added', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          values={{
            sourceRanges: [
              {
                sourceRange: '',
              },
            ],
            exposureMethod: ExposureMethod.LoadBalancer,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurations
              loadingDefaultsForEdition={false}
              alreadyVisited={false}
            />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    fireEvent.mouseDown(
      screen
        .getAllByRole('combobox')
        .find((el) => el.id === 'mui-component-select-exposureMethod')!
    );
    await waitFor(() =>
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    );
    const loadBalancerOption = screen
      .getAllByRole('option')
      .find((el) => el.textContent === 'Load balancer');

    expect(loadBalancerOption).toBeDefined();
    fireEvent.click(loadBalancerOption!);

    await waitFor(() =>
      expect(screen.getByTestId('select-input-exposure-method')).toHaveValue(
        'Load balancer'
      )
    );

    await waitFor(() =>
      expect(screen.getByTestId('external-access-fields')).toBeInTheDocument()
    );

    // Add the first source range
    const firstSourceRangeInput = screen.getByTestId(
      'text-input-source-ranges.0.source-range'
    );

    fireEvent.input(firstSourceRangeInput, {
      target: { value: '192.168.1.1/32' },
    });
    fireEvent.blur(firstSourceRangeInput);

    // Add a new source range input
    fireEvent.click(screen.getByTestId('add-text-input-button'));

    const secondSourceRangeInput = screen.getByTestId(
      'text-input-source-ranges.1.source-range'
    );

    await waitFor(() =>
      fireEvent.input(secondSourceRangeInput, {
        target: { value: '192.168.1.1/32' },
      })
    );
    fireEvent.input(secondSourceRangeInput, {
      target: { value: '192.168.1.1/32' },
    });
    fireEvent.blur(secondSourceRangeInput);

    await waitFor(() => expect(secondSourceRangeInput).toBeInvalid());

    // Check if the duplicate error message is displayed

    expect(
      screen.getByText(
        'Duplicate entry. This IP and netmask combination already exists.'
      )
    ).toBeInTheDocument();
  });

  it('should disable add new button when there are validation errors, empty fields, or duplicate keys', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          values={{
            annotations: [
              {
                key: 'invalid-key!',
                value: 'value1',
              },
            ],
          }}
        >
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurations
              loadingDefaultsForEdition={false}
              alreadyVisited={false}
            />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    const addButton = screen.getByText('Add new');
    expect(addButton).toBeDisabled();
  });
});
