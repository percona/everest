import { render, screen } from '@testing-library/react';
import { DbType } from '@percona/types';
import DbToggleCard from './db-toggle-card';

describe('DbToggleCard', () => {
  it('should render DB name', () => {
    render(<DbToggleCard value={DbType.Mongo} />);
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
    expect(screen.getByTestId('mongodb-toggle-button')).toBeInTheDocument();
  });
});
