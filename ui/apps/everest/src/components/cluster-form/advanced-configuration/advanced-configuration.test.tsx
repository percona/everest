import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
//
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import AdvancedConfigurationForm from './advanced-configuration';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { advancedConfigurationsSchema } from './advanced-configuration-schema';
import { DbWizardType } from 'pages/database-form/database-form-schema';
import { ExposureMethod } from './advanced-configuration.types';
import { DbType } from '@percona/types';

// Helper to mock load balancer configs hook
vi.mock('hooks/api/load-balancer', () => ({
  useLoadBalancerConfigs: vi.fn(() => ({
    data: {
      items: [
        { metadata: { name: 'lb-config-a' }, spec: { annotations: {} } },
        { metadata: { name: 'lb-config-b' }, spec: { annotations: {} } },
      ],
    },
    isLoading: false,
  })),
}));

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
      exposureMethod: ExposureMethod.ClusterIP,
      sourceRanges: [],
      ...values,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(vi.fn())}>{children}</form>
    </FormProvider>
  );
};

describe('AdvancedConfigurationForm - exposure methods and load balancer', () => {
  it('renders Load balancer fields when exposure method is Load balancer (no select interactions)', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          values={{ exposureMethod: ExposureMethod.LoadBalancer }}
        >
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurationForm dbType={DbType.Mysql} />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    // Exposure method select exists and holds Load balancer value
    const exposureSelect = screen.getByTestId(
      'select-input-exposure-method'
    ) as HTMLInputElement;
    expect(exposureSelect).toBeInTheDocument();
    expect(exposureSelect.value).toBe(ExposureMethod.LoadBalancer);

    // Load balancer configuration select is rendered
    expect(
      screen.getByTestId('select-input-load-balancer-config')
    ).toBeInTheDocument();

    // External access fields container is present (avoids ambiguous text queries)
    expect(screen.getByTestId('external-access-fields')).toBeInTheDocument();
  });

  it('appends /32 to source range input on blur when no netmask provided', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          values={{ exposureMethod: ExposureMethod.LoadBalancer }}
        >
          <QueryClientProvider client={queryClient}>
            <AdvancedConfigurationForm dbType={DbType.Mysql} />
          </QueryClientProvider>
        </FormProviderWrapper>
      </TestWrapper>
    );

    // Add a source range input and validate /32 auto-append
    fireEvent.click(screen.getByTestId('add-text-input-button'));
    const firstSourceRange = screen.getByTestId(
      'text-input-source-ranges.0.source-range'
    ) as HTMLInputElement;
    fireEvent.input(firstSourceRange, { target: { value: '10.0.0.1' } });
    fireEvent.blur(firstSourceRange);
    await waitFor(() => expect(firstSourceRange.value).toBe('10.0.0.1/32'));
  });
});
