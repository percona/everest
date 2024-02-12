import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { TestWrapper, resizeScreenSize } from 'utils/test';
import { AppBar } from '../app-bar/AppBar';
import { Drawer } from './Drawer';
import { DrawerContextProvider } from 'contexts/drawer/drawer.context';

const queryClient = new QueryClient();
vi.mock('hooks/api/version/useVersion');

const BarAndDrawer = () => (
  <QueryClientProvider client={queryClient}>
    <DrawerContextProvider>
      <AppBar />
      <Drawer />
    </DrawerContextProvider>
  </QueryClientProvider>
);

describe('Drawer', () => {
  it('should show desktop drawer when screen is "lg" or bigger', () => {
    resizeScreenSize(1200);

    render(
      <TestWrapper>
        <BarAndDrawer />
      </TestWrapper>
    );

    expect(
      screen.getByTestId('KeyboardDoubleArrowRightIcon')
    ).toBeInTheDocument();
    expect(screen.getByTestId('desktop-drawer-header')).toBeInTheDocument();
    expect(
      screen.queryByTestId('tablet-drawer-header')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mobile-drawer-header')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-drawer-button'));

    expect(
      screen.queryByTestId('KeyboardDoubleArrowRightIcon')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('KeyboardDoubleArrowLeftIcon')
    ).toBeInTheDocument();
  });

  it('should show tablet drawer starting at "sm" breakpoint', () => {
    resizeScreenSize(600);

    render(
      <TestWrapper>
        <BarAndDrawer />
      </TestWrapper>
    );

    expect(
      screen.getByTestId('KeyboardDoubleArrowRightIcon')
    ).toBeInTheDocument();
    expect(screen.getByTestId('tablet-drawer-header')).toBeInTheDocument();
    expect(
      screen.queryByTestId('desktop-drawer-header')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mobile-drawer-header')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-drawer-button'));

    expect(
      screen.queryByTestId('KeyboardDoubleArrowLeftIcon')
    ).toBeInTheDocument();
  });

  it('should show tablet drawer ending at "lg" breakpoint', () => {
    resizeScreenSize(1199);

    render(
      <TestWrapper>
        <BarAndDrawer />
      </TestWrapper>
    );
    expect(screen.getByTestId('tablet-drawer-header')).toBeInTheDocument();
    expect(
      screen.queryByTestId('desktop-drawer-header')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mobile-drawer-header')
    ).not.toBeInTheDocument();
  });

  it('should show mobile drawer when screen is "sm"', () => {
    resizeScreenSize(599);

    render(
      <TestWrapper>
        <BarAndDrawer />
      </TestWrapper>
    );

    // On mobile, we have one in the header, one hiding in the drawer
    expect(screen.getAllByTestId('KeyboardDoubleArrowRightIcon').length).toBe(
      2
    );
    expect(screen.getByTestId('mobile-drawer-header')).toBeInTheDocument();
    expect(
      screen.queryByTestId('desktop-drawer-header')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('tablet-drawer-header')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-drawer-button'));

    // When open, only the one in the header is present, but it's hidden by the drawer
    expect(screen.getAllByTestId('KeyboardDoubleArrowRightIcon').length).toBe(
      1
    );
    expect(
      screen.queryByTestId('KeyboardDoubleArrowLeftIcon')
    ).toBeInTheDocument();
  });

  it('should show the version', async () => {
    render(
      <TestWrapper>
        <BarAndDrawer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('help-appbar-button'));

    await waitFor(() =>
      expect(screen.getByRole('presentation')).toBeInTheDocument()
    );
  });
});
