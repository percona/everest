import { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { DbType } from '@percona/types';
import { TestWrapper } from 'utils/test';
import { FirstStep } from './first-step';
import { DbWizardFormFields } from '../../../database-form.types';

vi.mock('./utils', () => ({
  generateShortUID: vi.fn(() => '123'),
}));

vi.mock('hooks/api/db-engines/useDbEngines');
vi.mock('hooks/api/kubernetesClusters/useKubernetesClusterInfo');

interface FormProviderWrapperProps {
  handleSubmit: () => void;
  children: ReactNode;
}
const FormProviderWrapper = ({
  children,
  handleSubmit,
}: FormProviderWrapperProps) => {
  const methods = useForm({
    defaultValues: {
      [DbWizardFormFields.dbType]: DbType.Postresql,
      [DbWizardFormFields.dbName]: 'postgresql-123',
      // [DbWizardFormFields.k8sNamespace]: '',
      // [DbWizardFormFields.dbEnvironment]: '',
      [DbWizardFormFields.dbVersion]: '',
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)}>{children}</form>
    </FormProvider>
  );
};

describe('First Step', () => {
  it.skip('should set default values', async () => {
    const handleSubmitMock = vi.fn();

    render(
      <TestWrapper>
        <FormProviderWrapper handleSubmit={handleSubmitMock}>
          <FirstStep loadingDefaultsForEdition={false} alreadyVisited={false} />
          <button data-testid="submitButton" type="submit">
            submit
          </button>
        </FormProviderWrapper>
      </TestWrapper>
    );
    await waitFor(() => fireEvent.submit(screen.getByTestId('submitButton')));

    expect(handleSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dbType: DbType.Postresql,
        dbName: 'postgresql-123',
      }),
      expect.anything()
    );
  });

  // TODO it should be disabled if monitoring instances list length <=0 or undefined
});
