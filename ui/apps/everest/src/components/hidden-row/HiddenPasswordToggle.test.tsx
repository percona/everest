import { screen, render, fireEvent } from '@testing-library/react';
import { HiddenPasswordToggle } from './HiddenPasswordToggle';
import { Messages } from './HiddenPasswordToggle.messages';

describe('Drawer', () => {
  it('Should hide row by default', () => {
    render(<HiddenPasswordToggle value="test" />);
    expect(screen.getByTestId('hidden-row')).toHaveTextContent(
      Messages.asteriskHiddenText
    );
  });
  it('Should show row by icon click', async () => {
    render(<HiddenPasswordToggle value="test" />);
    expect(screen.getByTestId('hidden-row')).toHaveTextContent(
      Messages.asteriskHiddenText
    );
    const visabilityIcon = screen.getByTestId('VisibilityOffOutlinedIcon');
    expect(visabilityIcon).toBeInTheDocument();
    await fireEvent.click(visabilityIcon);
    expect(screen.getByTestId('hidden-row')).toHaveTextContent('test');
    expect(screen.getByTestId('VisibilityOutlinedIcon')).toBeInTheDocument();
  });
});
