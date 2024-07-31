import { Typography } from '@mui/material';
import { humanizeDbType } from './db-toggle-card.utils';
import type { DbToggleCardProps } from './db-toggle-card.types';
import ToggleCard from '../toggle-card';

const DbToggleCard = (props: DbToggleCardProps) => {
  const { value } = props;

  return (
    <ToggleCard {...props} data-testid={`${value}-toggle-button`}>
      <Typography variant="body1">{humanizeDbType(value)}</Typography>
    </ToggleCard>
  );
};

export default DbToggleCard;
