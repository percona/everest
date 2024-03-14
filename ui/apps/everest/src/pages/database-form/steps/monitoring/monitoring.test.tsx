import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { Monitoring } from './monitoring';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => {
  return {
    useMonitoringInstancesListByNamespace: vi.fn().mockReturnValue({
      data: [
        {
          type: 'type1',
          url: '127.0.0.1',
          name: 'PMM-local',
          allowedNamespaces: ['the-dark-side'],
        },
      ],
    }),
    useCreateMonitoringInstance: vi.fn().mockReturnValue({
      type: 'type1',
      url: '127.0.0.1',
      name: 'PMM-local',
      allowedNamespaces: ['the-dark-side'],
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

vi.mock('hooks/api/monitoring/useMonitoringInstancesList', () => ({
  useMonitoringInstancesListByNamespace:
    mocks.useMonitoringInstancesListByNamespace,
  useCreateMonitoringInstance: mocks.useCreateMonitoringInstance,
}));

vi.mock('../../useDatabasePageMode', () => ({
  useDatabasePageMode: () => 'new',
}));

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({
    defaultValues: {
      monitoring: false,
      monitoringInstance: '',
      k8sNamespace: 'the-dark-side',
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('Monitoring Step', () => {
  it("should render only monitoring input if it's off", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <FormProviderWrapper>
            <Monitoring />
          </FormProviderWrapper>
        </TestWrapper>
      </QueryClientProvider>
    );
    expect(screen.getByTestId('switch-input-monitoring')).toBeInTheDocument();
    expect(screen.getByTestId('switch-input-monitoring')).not.toHaveAttribute(
      'aria-disabled'
    );
    expect(screen.queryByTestId('monitoring-warning')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('text-input-monitoring-instance')
    ).not.toBeInTheDocument();
  });

  it('should render remaining fields when monitoring is on', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <FormProviderWrapper>
            <Monitoring />
          </FormProviderWrapper>
        </TestWrapper>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('switch-input-monitoring')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('switch-input-monitoring'));
    expect(
      screen.getByTestId('text-input-monitoring-instance')
    ).toBeInTheDocument();
  });

  it('should disable toggle when no monitoring instances defined', async () => {
    mocks.useMonitoringInstancesListByNamespace.mockReturnValue({
      data: [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <FormProviderWrapper>
            <Monitoring />
          </FormProviderWrapper>
        </TestWrapper>
      </QueryClientProvider>
    );

    expect(screen.queryByTestId('monitoring-warning')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('switch-input-monitoring')).toHaveAttribute(
        'aria-disabled'
      )
    );
  });
});
