import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { TimeValue } from 'components/time-selection/time-selection.types';
import { TimeSelection } from './time-selection';

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

describe('TimeSelection', () => {
  it('should render hours related field when clicked on hours field', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'hour' } });

    expect(selectTimeValue.getAttribute('value')).toBe('hour');
    expect(screen.queryByTestId('select-input-minute')).toBeInTheDocument();
    expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-input-hour')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-input-am-pm')).not.toBeInTheDocument();
  });

  it('should render days related field when clicked on days field', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'day' } });

    expect(selectTimeValue.getAttribute('value')).toBe('day');

    expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

    expect(
      screen.queryByTestId('select-input-minute-hour')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('select-input-week-day')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
  });

  it('should render weeks related field when clicked on weeks field', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'week' } });

    expect(selectTimeValue.getAttribute('value')).toBe('week');

    expect(screen.getByTestId('select-input-week-day')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

    expect(
      screen.queryByTestId('select-input-minute-hour')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-input-on-day')).not.toBeInTheDocument();
  });

  it('should render months related field when clicked on months field', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'month' } });

    expect(selectTimeValue.getAttribute('value')).toBe('month');

    expect(screen.getByTestId('select-input-on-day')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-hour')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-minute')).toBeInTheDocument();
    expect(screen.getByTestId('select-input-am-pm')).toBeInTheDocument();

    expect(
      screen.queryByTestId('select-input-minute-hour')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('select-input-week-day')
    ).not.toBeInTheDocument();
  });
});
