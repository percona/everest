import { render, waitFor, fireEvent } from '@testing-library/react';
import { DbType } from '@percona/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResourcesEditModal from './resources-edit-modal';
import { ResourceSize } from 'components/cluster-form';
const queryClient = new QueryClient();

describe('ResourcesEditModal', () => {
  it('should disable descaling to one node', async () => {
    const { getByTestId, getByText } = render(
      <QueryClientProvider client={queryClient}>
        <ResourcesEditModal
          handleCloseModal={vi.fn()}
          dbType={DbType.Mysql}
          shardingEnabled={false}
          onSubmit={vi.fn()}
          defaultValues={{
            numberOfNodes: '3',
            numberOfProxies: '3',
            cpu: 1,
            memory: 1,
            disk: 1,
            proxyCpu: 1,
            proxyMemory: 1,
            diskUnit: 'Gi',
            memoryUnit: 'GB',
            resourceSizePerNode: ResourceSize.custom,
            resourceSizePerProxy: ResourceSize.custom,
          }}
        />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(getByTestId('form-dialog-save')).not.toBeDisabled()
    );

    fireEvent.click(getByTestId('toggle-button-nodes-1'));

    await waitFor(() => expect(getByTestId('form-dialog-save')).toBeDisabled());
    expect(getByText('Cannot scale down to one node.')).toBeInTheDocument();

    fireEvent.click(getByTestId('toggle-button-nodes-5'));

    await waitFor(() =>
      expect(getByTestId('form-dialog-save')).not.toBeDisabled()
    );
  });
});
