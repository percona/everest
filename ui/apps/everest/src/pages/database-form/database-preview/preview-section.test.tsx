import { screen, render, fireEvent } from '@testing-library/react';
import { TestWrapper } from 'utils/test';
import { PreviewSection } from './preview-section';

describe('PreviewSection', () => {
  it('should show order number and title', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2}>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.getByText('2. My title')).toBeInTheDocument();
  });

  it('should not show content by default', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2}>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.queryByText('Some text')).not.toBeInTheDocument();
  });

  it('should not show edit icon by default', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2}>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.queryByTestId('edit-section-2')).not.toBeInTheDocument();
  });

  it('should show content only when hasBeenReach is true', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2} hasBeenReached>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.getByText('Some text')).toBeInTheDocument();
  });

  it('should show edit icon when it has been reached, but not active', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2} hasBeenReached>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.queryByTestId('edit-section-2')).toBeInTheDocument();
  });

  it('should not show edit icon when active', () => {
    render(
      <TestWrapper>
        <PreviewSection title="My title" order={2} hasBeenReached active>
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    expect(screen.queryByTestId('edit-section-2')).not.toBeInTheDocument();
  });

  it('should trigger edit callback', () => {
    const cb = vi.fn();

    render(
      <TestWrapper>
        <PreviewSection
          onEditClick={cb}
          title="My title"
          order={2}
          hasBeenReached
        >
          Some text
        </PreviewSection>
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('edit-section-2'));
    expect(cb).toHaveBeenCalled();
  });
});
