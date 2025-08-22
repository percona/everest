import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from 'utils/test';
import LoadBalancerConfiguration from './load-balancer-configuration';

vi.mock('hooks/rbac', () => ({
  useRBACPermissions: vi.fn(() => ({ canCreate: true })),
}));

vi.mock('hooks/api/load-balancer', () => ({
  useLoadBalancerConfigs: vi.fn(() => ({
    data: {
      items: [
        { metadata: { name: 'lbc-one' }, spec: {} },
        { metadata: { name: 'lbc-two' }, spec: {} },
      ],
    },
  })),
  useCreateLoadBalancerConfig: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteLoadBalancerConfig: vi.fn(() => ({ mutate: vi.fn() })),
}));

const queryClient = new QueryClient();

const renderPage = () =>
  render(
    <TestWrapper>
      <QueryClientProvider client={queryClient}>
        <LoadBalancerConfiguration />
      </QueryClientProvider>
    </TestWrapper>
  );

describe('Policies - Load Balancer Configuration page', () => {
  it('renders list with data and shows create button', async () => {
    renderPage();

    const createBtn = screen.getByTestId('add-config');
    expect(createBtn).toBeInTheDocument();
  });

  it('opens creation dialog and closes it', async () => {
    renderPage();

    fireEvent.click(await screen.findByTestId('add-config'));

    // Form dialog should open (created by FormDialog)
    expect(await screen.findByTestId('form-dialog')).toBeInTheDocument();

    // Cancel closes the dialog
    fireEvent.click(screen.getByTestId('form-dialog-cancel'));
    await waitFor(() =>
      expect(screen.queryByTestId('form-dialog')).not.toBeInTheDocument()
    );
  });

  it('opens row actions menu', async () => {
    renderPage();

    const menuBtn = await screen.findAllByTestId('row-actions-menu-button');
    expect(menuBtn.length).toBeGreaterThan(0);
    fireEvent.click(menuBtn[0]);
    expect(await screen.findByTestId('row-actions-menu')).toBeInTheDocument();
  });
});
