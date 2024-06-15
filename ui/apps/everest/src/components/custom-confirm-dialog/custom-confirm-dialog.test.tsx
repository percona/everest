import { render, screen } from '@testing-library/react';
import { TestWrapper } from 'utils/test';
import { FormProvider, useForm } from 'react-hook-form';
import { ReactNode } from 'react';
import { CustomConfirmDialog } from './custom-confirm-dialog';
import { CustomConfirmDialogFields } from './custom-confirm-dialog.types';

interface FormProviderWrapperProps {
  children: ReactNode;
}

const FormProviderWrapper = ({ children }: FormProviderWrapperProps) => {
  const methods = useForm({
    defaultValues: {
      [CustomConfirmDialogFields.confirmInput]: '',
      [CustomConfirmDialogFields.dataCheckbox]: true,
    },
  });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
};

describe('ConfirmFormDialog', () => {
  const selectedId = 'some-id';

  let input: HTMLInputElement;
  let button: HTMLButtonElement;

  it('Should have input with default empty value and disabled delete button', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <CustomConfirmDialog
            submitMessage="submit"
            alertMessage="alert"
            checkboxMessage="checkbox"
            closeModal={vi.fn}
            handleConfirm={vi.fn}
            selectedId={selectedId}
            isOpen
            headerMessage="Delete database"
          />
        </FormProviderWrapper>
      </TestWrapper>
    );

    input = screen.getByTestId('text-input-confirm-input');
    button = screen.getByTestId('form-dialog-submit');

    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');

    expect(button).toBeInTheDocument();
    expect(button.disabled).toBe(true);
  });

  it('Should have input with custom value', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <CustomConfirmDialog
            submitMessage="submit"
            alertMessage="alert"
            checkboxMessage="checkbox"
            closeModal={vi.fn}
            handleConfirm={vi.fn}
            selectedId={selectedId}
            validationMode="onTouched"
            isOpen
            headerMessage="Delete database"
            values={{
              [CustomConfirmDialogFields.confirmInput]: selectedId,
              [CustomConfirmDialogFields.dataCheckbox]: false,
            }}
          />
        </FormProviderWrapper>
      </TestWrapper>
    );

    input = screen.getByTestId('text-input-confirm-input');
    button = screen.getByTestId('form-dialog-submit');

    expect(input.value).toBe(selectedId);
  });
});
