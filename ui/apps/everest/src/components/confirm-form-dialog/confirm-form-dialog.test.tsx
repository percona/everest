import { render, screen } from '@testing-library/react';
import { ConfirmFormDialog } from './confirm-form-dialog';
import { TestWrapper } from 'utils/test';
import { FormProvider, useForm } from 'react-hook-form';
import { ReactNode } from 'react';
import { ConfirmFormDialogFields } from './confirm-form-dialog.types';
import { confirmDialogDefaultValues } from './confirm-dialog-consts';

interface FormProviderWrapperProps {
  children: ReactNode;
}

const FormProviderWrapper = ({ children }: FormProviderWrapperProps) => {
  const methods = useForm({
    defaultValues: confirmDialogDefaultValues,
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
          <ConfirmFormDialog
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
    button = screen.getByTestId('form-dialog-delete');

    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');

    expect(button).toBeInTheDocument();
    expect(button.disabled).toBe(true);
  });

  it('Should have input with custom value', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper>
          <ConfirmFormDialog
            closeModal={vi.fn}
            handleConfirm={vi.fn}
            selectedId={selectedId}
            validationMode="onTouched"
            isOpen
            headerMessage="Delete database"
            values={{ [ConfirmFormDialogFields.confirmInput]: selectedId }}
          />
        </FormProviderWrapper>
      </TestWrapper>
    );

    input = screen.getByTestId('text-input-confirm-input');
    button = screen.getByTestId('form-dialog-delete');

    expect(input.value).toBe(selectedId);
  });
});
