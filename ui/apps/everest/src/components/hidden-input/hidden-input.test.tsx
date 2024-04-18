import { screen, render, fireEvent } from '@testing-library/react';
import { HiddenInput } from './hidden-input';
import { FormProvider, useForm } from 'react-hook-form';

const FormProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm({
    defaultValues: {
      name: '',
      type: 's3',
      url: '',
      description: '',
      region: '',
      accessKey: '',
      secretKey: '',
      bucketName: '',
      allowedNamespaces: [],
      verifyTLS: true,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('Hidden Input', () => {
  beforeEach(() => {
    render(
      <FormProviderWrapper>
        <HiddenInput placeholder="placeholder" name="test" label="test" />
      </FormProviderWrapper>
    );
  });

  it('should hide text on default and show hidden visibility icon', () => {
    const hiddenInput = screen.getByTestId('text-input-test');
    const visibilityOffIcon = screen.getByTestId('VisibilityOffOutlinedIcon');

    expect(visibilityOffIcon).toBeInTheDocument();
    fireEvent.change(hiddenInput, { target: { value: 'test' } });
    expect(hiddenInput).toHaveValue('test');
    expect(hiddenInput).toHaveAttribute('type', 'password');
  });

  it('should show text on icon toggle', async () => {
    const hiddenInput = screen.getByTestId('text-input-test');
    const visibilityOffIcon = screen.getByTestId('VisibilityOffOutlinedIcon');

    expect(visibilityOffIcon).toBeInTheDocument();
    fireEvent.change(hiddenInput, { target: { value: 'test' } });

    await fireEvent.click(visibilityOffIcon);

    const visibilityOnIcon = screen.getByTestId('VisibilityOutlinedIcon');
    expect(visibilityOnIcon).toBeInTheDocument();

    expect(hiddenInput).toHaveValue('test');
    expect(hiddenInput).toHaveAttribute('type', 'text');
  });
});
