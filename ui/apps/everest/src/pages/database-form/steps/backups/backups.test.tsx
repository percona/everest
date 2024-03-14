import { render, screen } from '@testing-library/react';
import { TimeValue } from 'components/time-selection/time-selection.types';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from 'utils/test';
import { Backups } from './backups.tsx';

vi.mock('hooks/api/backup-storages/useBackupStorages');
vi.mock('hooks/api/db-cluster/useDbCluster');

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
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('BackupsStep', () => {
  it('should render nothing when backups are disabled by non-existent storage location', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <FormProviderWrapper>
            <Backups alreadyVisited={false} loadingDefaultsForEdition={false} />
          </FormProviderWrapper>
        </TestWrapper>
      </QueryClientProvider>
    );

    expect(
      screen.getByTestId('switch-input-backups-enabled').querySelector('input')
    ).toBeChecked();
    expect(screen.getByTestId('no-storage-message')).toBeInTheDocument();
    expect(
      screen.queryByTestId('text-input-storage-location')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('select-input-selected-time')
    ).not.toBeInTheDocument();
  });
});
