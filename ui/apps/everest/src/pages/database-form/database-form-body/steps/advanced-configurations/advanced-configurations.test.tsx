import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { TestWrapper } from 'utils/test';
import { AdvancedConfigurations } from './advanced-configurations';

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({
    defaultValues: {
      externalAccess: false,
      engineParametersEnabled: false,
      sourceRanges: [
        {
          sourgeRange: '192.168.1.1',
        },
      ],
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('FourthStep', () => {
  it("should render only external access input if it's off", () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <AdvancedConfigurations />
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
          <AdvancedConfigurations />
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
});
