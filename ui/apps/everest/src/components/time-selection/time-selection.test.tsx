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

  it('should render correctly for monthly values for UTX+X:30 timezone', () => {
    vi.stubEnv('TZ', 'Asia/Calcutta');
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection shouldRestrictSelectableHours />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'month' } });

    expect(selectTimeValue.getAttribute('value')).toBe('month');

    expect(screen.getByTestId('select-input-hour')).toHaveAttribute(
      'value',
      '5'
    );
    expect(screen.getByTestId('select-input-minute')).toHaveAttribute(
      'value',
      '30'
    );
  });

  it('should render correctly for UTX+X timezone with or without DST when monthly is selected', () => {
    vi.stubEnv('TZ', 'Europe/Amsterdam');
    const today = new Date();
    const janOffset = new Date(today.getFullYear(), 0, 1).getTimezoneOffset();
    const julOffset = new Date(today.getFullYear(), 6, 1).getTimezoneOffset();
    const isDST = today.getTimezoneOffset() < Math.max(janOffset, julOffset);

    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection shouldRestrictSelectableHours />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'month' } });

    expect(selectTimeValue.getAttribute('value')).toBe('month');

    expect(screen.getByTestId('select-input-hour')).toHaveAttribute(
      'value',
      isDST ? '2' : '1'
    );
    expect(screen.getByTestId('select-input-minute')).toHaveAttribute(
      'value',
      '0'
    );
  });

  it('should render correctly for UTX-X timezone if monthly is selected ', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection shouldRestrictSelectableHours />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'month' } });

    expect(selectTimeValue.getAttribute('value')).toBe('month');

    expect(screen.getByTestId('select-input-hour')).toHaveAttribute(
      'value',
      '12'
    );
    expect(screen.getByTestId('select-input-minute')).toHaveAttribute(
      'value',
      '0'
    );
  });

  it('should render normally if monthly is selected and selectable hours are not restricted', () => {
    vi.stubEnv('TZ', 'Asia/Calcutta');
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <TimeSelection shouldRestrictSelectableHours={false} />
        </FormProviderWrapper>
      </TestWrapper>
    );

    const selectTimeValue = screen.getByTestId('select-input-selected-time');
    expect(selectTimeValue).toBeInTheDocument();

    fireEvent.change(selectTimeValue, { target: { value: 'month' } });

    expect(selectTimeValue.getAttribute('value')).toBe('month');

    expect(screen.getByTestId('select-input-hour')).toHaveAttribute(
      'value',
      '12'
    );
    expect(screen.getByTestId('select-input-minute')).toHaveAttribute(
      'value',
      '0'
    );
  });
});
