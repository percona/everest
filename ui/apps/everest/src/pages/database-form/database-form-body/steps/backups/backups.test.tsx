import { render, screen } from '@testing-library/react';
import { TimeValue } from 'components/time-selection/time-selection.types';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from 'utils/test';
import { Backups } from './backups.tsx';

vi.mock('hooks/api/backup-storages/useBackupStorages');
vi.mock('hooks/api/db-cluster/useDbCluster');
vi.mock('hooks/api/backups/useBackups', () => ({
  useDbBackups: () => ({
    data: [],
    isFetching: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({
    defaultValues: {
      backupsEnabled: true,
      storageLocation: 'S3',
      selectedTime: TimeValue.hours,
      minute: 0,
      hour: 12,
      amPm: 'AM',
      weekDay: 'Monday',
      onDay: 1,
      schedules: [],
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('BackupsStep', () => {
  it('should render nothing when no backup storage', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <FormProviderWrapper>
            <Backups />
          </FormProviderWrapper>
        </TestWrapper>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('no-storage-message')).toBeInTheDocument();
    expect(screen.queryByTestId('editable-item')).not.toBeInTheDocument();
  });

  // it('should render everything when backups are enabled', () => {
  //   render(
  //     <TestWrapper>
  //       <FormProviderWrapper>
  //         <ThirdStep />
  //       </FormProviderWrapper>
  //     </TestWrapper>
  //   );

  //   expect(
  //     screen.getByTestId('switch-input-backups-enabled')
  //   ).toBeInTheDocument();
  //   expect(
  //     screen.getByTestId('text-input-storage-location')
  //   ).toBeInTheDocument();
  //   // expect(screen.getByTestId('switch-input-pitr-enabled')).toBeInTheDocument();
  //   // expect(screen.getByTestId('pitr-time-minutes')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-selected-time')).toBeInTheDocument();
  // });

  // //   expect(
  // //     screen.getByTestId('switch-input-backups-enabled')
  // //   ).toBeInTheDocument();
  // //   expect(screen.getByTestId('switch-input-pitr-enabled')).toBeInTheDocument();
  // //   expect(screen.getByTestId('pitr-time-minutes')).toBeInTheDocument();
  // // });

  // //   expect(
  // //     screen.getByTestId('switch-input-backups-enabled')
  // //   ).toBeInTheDocument();
  // //   expect(screen.getByTestId('switch-input-pitr-enabled')).toBeInTheDocument();
  // //   expect(screen.getByTestId('pitr-time-minutes')).toBeInTheDocument();

  // //   fireEvent.click(screen.getByTestId('switch-input-pitr-enabled'));
  // //   expect(screen.queryByTestId('pitr-time-minutes')).not.toBeInTheDocument();
  // // });

  // it('should render hours related field when clicked on hours field', () => {
  //   render(
  //     <TestWrapper>
  //       <FormProviderWrapper>
  //         <ThirdStep />
  //       </FormProviderWrapper>
  //     </TestWrapper>
  //   );

  //   expect(
  //     screen.getByTestId('switch-input-backups-enabled')
  //   ).toBeInTheDocument();
  //   const selectTimeValue = screen.getByTestId('select-input-selected-time');
  //   expect(selectTimeValue).toBeInTheDocument();

  //   fireEvent.change(selectTimeValue, { target: { value: 'hours' } });

  //   expect(selectTimeValue.getAttribute('value')).toBe('hours');
  //   expect(screen.getByTestId('select-input-minute-hour')).toBeInTheDocument();

  //   expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('select-input-hour')).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('select-input-minute')).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('select-input-am-pm')).not.toBeInTheDocument();
  // });

  // it('should render days related field when clicked on days field', () => {
  //   render(
  //     <TestWrapper>
  //       <FormProviderWrapper>
  //         <ThirdStep />
  //       </FormProviderWrapper>
  //     </TestWrapper>
  //   );

  //   expect(
  //     screen.getByTestId('switch-input-backups-enabled')
  //   ).toBeInTheDocument();
  //   const selectTimeValue = screen.getByTestId('select-input-selected-time');
  //   expect(selectTimeValue).toBeInTheDocument();

  //   fireEvent.change(selectTimeValue, { target: { value: 'days' } });

  //   expect(selectTimeValue.getAttribute('value')).toBe('days');

  //   expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

  //   expect(
  //     screen.queryByTestId('select-input-minute-hour')
  //   ).not.toBeInTheDocument();
  //   expect(
  //     screen.queryByTestId('select-input-week-day')
  //   ).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
  // });

  // it('should render weeks related field when clicked on weeks field', () => {
  //   render(
  //     <TestWrapper>
  //       <FormProviderWrapper>
  //         <ThirdStep />
  //       </FormProviderWrapper>
  //     </TestWrapper>
  //   );

  //   expect(
  //     screen.getByTestId('switch-input-backups-enabled')
  //   ).toBeInTheDocument();
  //   const selectTimeValue = screen.getByTestId('select-input-selected-time');
  //   expect(selectTimeValue).toBeInTheDocument();

  //   fireEvent.change(selectTimeValue, { target: { value: 'weeks' } });

  //   expect(selectTimeValue.getAttribute('value')).toBe('weeks');

  //   expect(screen.getByTestId('select-input-week-day')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

  //   expect(
  //     screen.queryByTestId('select-input-minute-hour')
  //   ).not.toBeInTheDocument();
  //   expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
  // });

  // it('should render months related field when clicked on months field', () => {
  //   render(
  //     <TestWrapper>
  //       <FormProviderWrapper>
  //         <ThirdStep />
  //       </FormProviderWrapper>
  //     </TestWrapper>
  //   );

  //   expect(
  //     screen.getByTestId('switch-input-backups-enabled')
  //   ).toBeInTheDocument();
  //   const selectTimeValue = screen.getByTestId('select-input-selected-time');
  //   expect(selectTimeValue).toBeInTheDocument();

  //   fireEvent.change(selectTimeValue, { target: { value: 'months' } });

  //   expect(selectTimeValue.getAttribute('value')).toBe('months');

  //   expect(screen.getByTestId('select-input-on-day')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
  //   expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

  //   expect(
  //     screen.queryByTestId('select-input-minute-hour')
  //   ).not.toBeInTheDocument();
  //   expect(
  //     screen.queryByTestId('select-input-week-day')
  //   ).not.toBeInTheDocument();
  // });
});
