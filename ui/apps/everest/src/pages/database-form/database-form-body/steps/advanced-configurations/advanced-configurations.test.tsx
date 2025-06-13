import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { AdvancedConfigurations } from './advanced-configurations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { advancedConfigurationsSchema } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
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
      externalAccess: false,
      engineParametersEnabled: false,
      podSchedulingPolicyEnabled: false,
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
  it("should render only external access input if it's off", () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurations
              loadingDefaultsForEdition={false}
              alreadyVisited={false}
            />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(
      screen.getByTestId('switch-input-external-access')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('switch-input-internet-facing')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('text-input-source-ranges.0.source-range')
    ).not.toBeInTheDocument();
  });

  it('should render remaining fields when external access is on', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurations
              loadingDefaultsForEdition={false}
              alreadyVisited={false}
            />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('switch-input-external-access'));

    expect(
      screen.getByTestId('switch-input-external-access')
    ).toBeInTheDocument();
    // expect(
    //   screen.getByTestId('switch-input-internet-facing')
    // ).toBeInTheDocument();
    expect(
      screen.getByTestId('text-input-source-ranges.0.source-range')
    ).toBeInTheDocument();
  });

  it('should show an error message when duplicate sourceRanges are added', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          values={{
            sourceRanges: [],
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

    // Enable external access
    const checkbox = screen
      .getByTestId('switch-input-external-access')
      .querySelector('input');
    fireEvent.click(checkbox!);

    expect(checkbox).toBeChecked();

    await waitFor(() =>
      expect(screen.getByTestId('external-access-fields')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('add-text-input-button'));

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
});
