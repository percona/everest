import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { FifthStep } from './fifth-step';

const mocks = vi.hoisted(() => {
  return {
    useMonitoringInstancesList: vi.fn().mockReturnValue({
      data: [
        {
          type: 'type1',
          url: '127.0.0.1',
          name: 'PMM-local',
        },
      ],
    }),
  };
});

vi.mock('hooks/api/monitoring/useMonitoringInstancesList', () => ({
  useMonitoringInstancesList: mocks.useMonitoringInstancesList,
}));

vi.mock('../../useDatabasePageMode', () => ({
  useDatabasePageMode: () => 'new',
}));

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({
    defaultValues: { monitoring: false, monitoringInstance: '' },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('AdvancedConfigurations', () => {
  it("should render only monitoring input if it's off", () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <FifthStep />
        </FormProviderWrapper>
      </TestWrapper>
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
      <TestWrapper>
        <FormProviderWrapper>
          <FifthStep />
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(screen.getByTestId('switch-input-monitoring')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('switch-input-monitoring'));
    expect(
      screen.getByTestId('text-input-monitoring-instance')
    ).toBeInTheDocument();
  });

  it('should disable toggle when no monitoring instances defined', async () => {
    mocks.useMonitoringInstancesList.mockReturnValue({
      data: [],
    });

    render(
      <TestWrapper>
        <FormProviderWrapper>
          <FifthStep />
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(screen.queryByTestId('monitoring-warning')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('switch-input-monitoring')).toHaveAttribute(
        'aria-disabled'
      )
    );
  });
});
