import { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { DbType } from '@percona/types';
import { TestWrapper } from 'utils/test';
import { ResourcesStep } from './resources-step.tsx';
import { ResourceSize } from './resources-step.types';
import { DEFAULT_SIZES } from './resources-step.const';
import { DbWizardFormFields } from '../../database-form.types';
import { Mock } from 'vitest';
import { DbWizardType } from '../../database-form-schema.ts';

vi.mock('hooks/api/kubernetesClusters/useSelectedKubernetesCluster');
vi.mock('hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo');

interface FormProviderWrapperProps {
  handleSubmit: Mock;
  children: ReactNode;
  values?: Partial<DbWizardType>;
}

const FormProviderWrapper = ({
  children,
  handleSubmit,
  values,
}: FormProviderWrapperProps) => {
  const methods = useForm({
    defaultValues: {
      [DbWizardFormFields.dbType]: DbType.Mysql,
      [DbWizardFormFields.numberOfNodes]: '1',
      [DbWizardFormFields.resourceSizePerNode]: ResourceSize.small,
      [DbWizardFormFields.cpu]: DEFAULT_SIZES.small.cpu,
      [DbWizardFormFields.disk]: DEFAULT_SIZES.small.disk,
      [DbWizardFormFields.memory]: DEFAULT_SIZES.small.memory,
      ...values,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)}>{children}</form>
    </FormProvider>
  );
};

describe('Resources Step', () => {
  it('should set default values', async () => {
    const handleSubmitMock = vi.fn();

    render(
      <TestWrapper>
        <FormProviderWrapper handleSubmit={handleSubmitMock}>
          <ResourcesStep />
          <button data-testid="submitButton" type="submit">
            submit
          </button>
        </FormProviderWrapper>
      </TestWrapper>
    );

    await waitFor(() => fireEvent.submit(screen.getByTestId('submitButton')));

    expect(handleSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [DbWizardFormFields.cpu]: 1,
        [DbWizardFormFields.disk]: 25,
        [DbWizardFormFields.memory]: 2,
        [DbWizardFormFields.numberOfNodes]: '1',
        [DbWizardFormFields.resourceSizePerNode]: 'small',
      }),
      expect.anything()
    );
  });

  it('should have 1, 2 and 3 nodes for PostgreSQL', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          handleSubmit={vi.fn()}
          values={{ dbType: DbType.Postresql }}
        >
          <ResourcesStep />
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(screen.queryByTestId('toggle-button-nodes-1')).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-button-nodes-2')).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-button-nodes-3')).toBeInTheDocument();
    expect(
      screen.queryByTestId('toggle-button-nodes-4')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('toggle-button-nodes-5')
    ).not.toBeInTheDocument();
  });

  it('should have 1, 3 and 5 nodes for MySQL', () => {
    render(
      <TestWrapper>
        <FormProviderWrapper
          handleSubmit={vi.fn()}
          values={{ dbType: DbType.Mysql }}
        >
          <ResourcesStep />
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(screen.queryByTestId('toggle-button-nodes-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('toggle-button-nodes-2')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggle-button-nodes-3')).toBeInTheDocument();
    expect(
      screen.queryByTestId('toggle-button-nodes-4')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggle-button-nodes-5')).toBeInTheDocument();
  });

  it('should change input values while switching resource size per node tabs', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper handleSubmit={vi.fn()}>
          <ResourcesStep />
        </FormProviderWrapper>
      </TestWrapper>
    );

    expect(screen.getByTestId('text-input-cpu')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.small][DbWizardFormFields.cpu].toString()
    );
    expect(screen.getByTestId('text-input-memory')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.small][DbWizardFormFields.memory].toString()
    );
    expect(screen.getByTestId('text-input-disk')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.small][DbWizardFormFields.disk].toString()
    );

    const mediumButton = screen.getByTestId('toggle-button-medium');
    await waitFor(() => fireEvent.click(mediumButton));

    expect(screen.getByTestId('text-input-cpu')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.medium][DbWizardFormFields.cpu].toString()
    );
    expect(screen.getByTestId('text-input-memory')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.medium][DbWizardFormFields.memory].toString()
    );
    expect(screen.getByTestId('text-input-disk')).toHaveValue(
      DEFAULT_SIZES[ResourceSize.medium][DbWizardFormFields.disk].toString()
    );
  });

  it('should set custom tab when resource size per node input is changed by user', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper handleSubmit={vi.fn()}>
          <ResourcesStep />
          <button data-testid="submitButton" type="submit">
            submit
          </button>
        </FormProviderWrapper>
      </TestWrapper>
    );
    const cpu = screen.getByTestId('text-input-cpu');

    expect(cpu).toHaveValue(
      DEFAULT_SIZES[ResourceSize.small][DbWizardFormFields.cpu].toString()
    );

    await waitFor(() => fireEvent.change(cpu, { target: { value: 5 } }));

    expect(cpu).toHaveValue('5');

    const pressedButtons = screen.getAllByRole('button', { pressed: true });
    expect(pressedButtons[0]).toHaveValue('1');
    expect(pressedButtons[1]).toHaveValue(ResourceSize.custom);
  });
  // TODO should be fixed
  it.skip('should show warning when the value entered by the user exceeds the maximum recommended value', async () => {
    render(
      <TestWrapper>
        <FormProviderWrapper handleSubmit={vi.fn()}>
          <ResourcesStep />
          <button data-testid="submitButton" type="submit">
            submit
          </button>
        </FormProviderWrapper>
      </TestWrapper>
    );

    const cpu = screen.getByTestId('text-input-cpu');
    expect(cpu).toHaveValue(
      DEFAULT_SIZES[ResourceSize.small][DbWizardFormFields.cpu].toString()
    );
    expect(
      screen.queryByTestId('resources-exceeding-alert')
    ).not.toBeInTheDocument();

    const maxCPU =
      screen.getByTestId('cpu-progress-bar').getAttribute('aria-valuemax') ||
      '';

    await waitFor(() =>
      fireEvent.change(cpu, { target: { value: +maxCPU + 1 } })
    );

    expect(screen.getByTestId('resources-exceeding-alert')).toBeInTheDocument();
  });
});
