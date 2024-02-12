import { render, screen } from '@testing-library/react';
import { TestWrapper } from 'utils/test';
import { DefaultConfigurations } from './default-configurations';
import { Messages } from './default-configurations.messages';

describe('Default Configurations', () => {
  it('should show default values', async () => {
    render(
      <TestWrapper>
        <DefaultConfigurations />
      </TestWrapper>
    );
    expect(screen.getByTestId('default-configurations-info')).toHaveTextContent(
      Messages.pageDescription
    );
    expect(
      screen.getByTestId('switch-input-monitoring').querySelector('input')
    ).not.toBeChecked();
    expect(
      screen.getByTestId('switch-input-backups-enabled').querySelector('input')
    ).not.toBeChecked();
    expect(
      screen.getByTestId('switch-input-external-access').querySelector('input')
    ).not.toBeChecked();
  });
});
