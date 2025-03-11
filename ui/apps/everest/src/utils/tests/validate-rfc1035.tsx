import React from 'react';
import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import { TestWrapper } from '../test';
import { FormProvider, useForm } from 'react-hook-form';

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({});

  return <FormProvider {...methods}>{children}</FormProvider>;
};

export const validateInputWithRFC1035 = ({
  renderComponent,
  suiteName,
  errors,
}: {
  renderComponent: () => JSX.Element;
  suiteName: string;
  errors: Record<string, string>;
}) => {
  describe(suiteName, () => {
    beforeEach(() => {
      render(
        <TestWrapper>
          <FormProviderWrapper>{renderComponent()}</FormProviderWrapper>
        </TestWrapper>
      );
    });

    describe('name input', () => {
      it('should not display error for correct value', () => {
        const input = screen.getByTestId('text-input-name');
        fireEvent.change(input, {
          target: { value: 'name-input-test-123a' },
        });

        waitFor(() =>
          Object.values(errors).forEach((val) => {
            expect(screen.getByText(val)).not.toBeInTheDocument();
          })
        );
      });

      it('should display error for empty string', async () => {
        const input = screen.getByTestId('text-input-name') as HTMLInputElement;

        waitFor(() =>
          expect(screen.getByText(errors.MIN1_ERROR)).not.toBeInTheDocument()
        );
        fireEvent.change(input, {
          target: { value: '' },
        });

        expect(input.value).toBe('');

        waitFor(() =>
          expect(screen.getByText(errors.MIN1_ERROR)).not.toBeInTheDocument()
        );
      });

      it('should display error for a string too long', () => {
        const nameInput = screen.getByTestId('text-input-name');
        fireEvent.change(nameInput, {
          target: {
            value: 'ABCDEFGHIJKLMNOPQRSTUV',
          },
        });

        waitFor(() =>
          expect(screen.getByText(errors.MAX22_ERROR)).not.toBeInTheDocument()
        );

        fireEvent.change(nameInput, {
          target: {
            value: 'ABCDEFGHIJKLMNOPQRSTUVWV',
          },
        });

        waitFor(() =>
          expect(screen.getByText(errors.MAX22_ERROR)).toBeInTheDocument()
        );
      });

      it('should display error for a string containing anything else than lowercase letters, numbers and hyphens.', () => {
        const nameInput = screen.getByTestId('text-input-name');
        fireEvent.change(nameInput, {
          target: {
            value: 'test_123',
          },
        });

        waitFor(() =>
          expect(
            screen.getByText(errors.SPECIAL_CHAR_ERROR)
          ).not.toBeInTheDocument()
        );

        fireEvent.change(nameInput, {
          target: {
            value: 'test@_123',
          },
        });

        waitFor(() =>
          expect(
            screen.getByText(errors.SPECIAL_CHAR_ERROR)
          ).toBeInTheDocument()
        );
      });

      it('should display error for a string ending with a hyphen', () => {
        const nameInput = screen.getByTestId('text-input-name');
        fireEvent.change(nameInput, {
          target: {
            value: 'test_123',
          },
        });

        waitFor(() =>
          expect(
            screen.getByText(errors.END_CHAR_ERROR)
          ).not.toBeInTheDocument()
        );

        fireEvent.change(nameInput, {
          target: {
            value: 'test123_',
          },
        });

        waitFor(() =>
          expect(screen.getByText(errors.END_CHAR_ERROR)).toBeInTheDocument()
        );
      });

      it('should display error for a string starting with a hyphen or number', () => {
        const nameInput = screen.getByTestId('text-input-name');
        fireEvent.change(nameInput, {
          target: {
            value: 'test_123',
          },
        });

        waitFor(() =>
          expect(
            screen.getByText(errors.START_CHAR_ERROR)
          ).not.toBeInTheDocument()
        );

        fireEvent.change(nameInput, {
          target: {
            value: '_test123',
          },
        });

        waitFor(() =>
          expect(screen.getByText(errors.START_CHAR_ERROR)).toBeInTheDocument()
        );

        fireEvent.change(nameInput, {
          target: {
            value: '1test',
          },
        });

        waitFor(() =>
          expect(screen.getByText(errors.START_CHAR_ERROR)).toBeInTheDocument()
        );
      });
    });
  });
};
