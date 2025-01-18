import { DbType } from '@percona/types';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AffinityFormDialogContext } from './affinity-form-dialog-context/affinity-form-context';
import { AffinityFormDialogContextType } from './affinity-form-dialog-context/affinity-form-dialog-context.types';
import { AffinityFormDialog } from './affinity-form-dialog';

const contextDefaultProps: AffinityFormDialogContextType = {
  openAffinityModal: true,
  handleClose: () => {},
  handleSubmit: () => {},
  selectedAffinityUid: null,
  setOpenAffinityModal: () => {},
  affinityRules: [],
  dbType: DbType.Mongo,
  isShardingEnabled: false,
};

const Wrapper = ({
  contextProps,
}: {
  contextProps?: Partial<AffinityFormDialogContextType>;
}) => {
  return (
    <AffinityFormDialogContext.Provider
      value={{
        ...contextDefaultProps,
        ...contextProps,
      }}
    >
      <AffinityFormDialog />
    </AffinityFormDialogContext.Provider>
  );
};

const selectTypeOption = (optionText: string) => {
  fireEvent.mouseDown(
    within(screen.getByTestId('select-type-button')).getByRole('combobox')
  );
  const option = screen
    .getAllByRole('option')
    .find((o) => o.textContent === optionText);

  expect(option).toBeDefined();
  fireEvent.click(option!);
};

const selectOperatorOption = (optionText: string) => {
  fireEvent.mouseDown(
    within(screen.getByTestId('select-operator-button')).getByRole('combobox')
  );
  const option = screen
    .getAllByRole('option')
    .find((o) => o.textContent === optionText);

  expect(option).toBeDefined();
  fireEvent.click(option!);
};

describe('AffinityFormDialog', () => {
  describe('MongoDB', () => {
    test('show defaults', () => {
      render(<Wrapper />);
      expect(screen.getByTestId('select-input-component')).toHaveValue(
        'dbNode'
      );
      expect(screen.getByTestId('select-input-type')).toHaveValue(
        'podAntiAffinity'
      );
      expect(screen.getByTestId('text-input-weight')).toHaveValue(1);
      expect(screen.getByTestId('text-input-topology-key')).toHaveValue(
        'kubernetes.io/hostname'
      );
    });

    test('sharding disabled only allows Db Node component', async () => {
      render(<Wrapper />);
      expect(screen.getByTestId('select-input-component')).toHaveValue(
        'dbNode'
      );
      fireEvent.mouseDown(
        within(screen.getByTestId('select-component-button')).getByRole(
          'combobox'
        )
      );
      await waitFor(() =>
        expect(screen.getByTestId('dbNode')).toBeInTheDocument()
      );
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('DB Node');
    });

    test('sharding enabled allows all components', async () => {
      render(
        <Wrapper
          contextProps={{
            isShardingEnabled: true,
          }}
        />
      );
      expect(screen.getByTestId('select-input-component')).toHaveValue(
        'dbNode'
      );
      fireEvent.mouseDown(
        within(screen.getByTestId('select-component-button')).getByRole(
          'combobox'
        )
      );
      await waitFor(() =>
        expect(screen.getByTestId('dbNode')).toBeInTheDocument()
      );
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      ['DB Node', 'Config Server', 'Proxy'].forEach((component) =>
        expect(
          options.some((option) => option.textContent === component)
        ).toBeTruthy()
      );
    });
  });

  describe('PostgreSQL', () => {
    test('sharding enabled allows all components', async () => {
      render(
        <Wrapper
          contextProps={{
            dbType: DbType.Postresql,
          }}
        />
      );
      expect(screen.getByTestId('select-input-component')).toHaveValue(
        'dbNode'
      );
      fireEvent.mouseDown(
        within(screen.getByTestId('select-component-button')).getByRole(
          'combobox'
        )
      );
      await waitFor(() =>
        expect(screen.getByTestId('dbNode')).toBeInTheDocument()
      );
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      ['DB Node', 'Proxy'].forEach((component) =>
        expect(
          options.some((option) => option.textContent === component)
        ).toBeTruthy()
      );
    });
  });

  describe('Node Affinity', () => {
    test('Mandatory key and operator', async () => {
      render(<Wrapper />);

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
      );
      selectTypeOption('Node affinity');

      await waitFor(() =>
        expect(screen.getByTestId('text-input-key')).toBeInvalid()
      );
      expect(
        screen.getByTestId('text-input-topology-key')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled();
      expect(screen.getByTestId('text-input-key')).toHaveValue('');

      fireEvent.change(screen.getByTestId('text-input-key'), {
        target: { value: 'my-key' },
      });

      await waitFor(() =>
        expect(screen.getByTestId('text-input-key')).not.toBeInvalid()
      );

      expect(screen.getByTestId('select-input-operator')).toHaveValue('');
      expect(screen.getByTestId('select-input-operator')).toBeInvalid();
      expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled();

      selectOperatorOption('exists');

      await waitFor(() =>
        expect(screen.getByTestId('select-input-operator')).not.toBeInvalid()
      );
      expect(screen.getByTestId('select-input-operator')).toHaveValue('Exists');
      expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled();
    });

    test('Mandatory value if operator is "In" or "NotIn"', async () => {
      render(<Wrapper />);
      selectTypeOption('Node affinity');
      fireEvent.change(screen.getByTestId('text-input-key'), {
        target: { value: 'my-key' },
      });
      selectOperatorOption('in');

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
      );

      fireEvent.change(screen.getByTestId('text-input-values'), {
        target: { value: 'val1,val2' },
      });

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
      );

      fireEvent.change(screen.getByTestId('text-input-values'), {
        target: { value: '' },
      });

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
      );

      selectOperatorOption('not in');

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
      );

      fireEvent.change(screen.getByTestId('text-input-values'), {
        target: { value: 'val1,val2' },
      });

      await waitFor(() =>
        expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
      );
    });
  });

  describe('Pod (Anti-)Affinity', () => {
    ['Pod affinity', 'Pod anti-affinity'].forEach((type) => {
      test(`Mandatory topology key for ${type}`, async () => {
        render(<Wrapper />);
        selectTypeOption(type);

        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
        );
        fireEvent.change(screen.getByTestId('text-input-topology-key'), {
          target: { value: '' },
        });
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
        );
        fireEvent.change(screen.getByTestId('text-input-topology-key'), {
          target: { value: 'toplogy-key' },
        });
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
        );
      });

      test(`Operator and values mandatory if key not empty for ${type}`, async () => {
        render(<Wrapper />);
        selectTypeOption(type);
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
        );
        expect(screen.getByTestId('select-input-operator')).toBeDisabled();
        fireEvent.change(screen.getByTestId('text-input-key'), {
          target: { value: 'my-key' },
        });
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
        );
        expect(screen.getByTestId('select-input-operator')).not.toBeDisabled();
        expect(screen.getByTestId('select-input-operator')).toBeInvalid();
        selectOperatorOption('exists');
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
        );
        selectOperatorOption('in');
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).toBeDisabled()
        );
        fireEvent.change(screen.getByTestId('text-input-values'), {
          target: { value: 'val1' },
        });
        await waitFor(() =>
          expect(screen.getByTestId('form-dialog-add-rule')).not.toBeDisabled()
        );
      });
    });
  });
});
