import { SvgIconProps, Typography } from '@mui/material';
import { DbType } from '@percona/types';
import { humanizeDbType } from './db-toggle-card.utils';
import type { DbToggleCardProps } from './db-toggle-card.types';
import ToggleCard from '../toggle-card';
import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '../icons';

const iconMap: Record<DbType, (props: SvgIconProps) => React.JSX.Element> = {
  [DbType.Postresql]: PostgreSqlIcon,
  [DbType.Mongo]: MongoIcon,
  [DbType.Mysql]: MySqlIcon,
};

const DbIcon = ({ type }: { type: DbType }) => {
  const commonProps: SvgIconProps = {
    fontSize: 'medium',
    sx: { mr: 1 },
  };

  const MappedIcon = iconMap[type];

  return <MappedIcon {...commonProps} />;
};

const DbToggleCard = (props: DbToggleCardProps) => {
  const { value } = props;

  return (
    <ToggleCard {...props} data-testid={`${value}-toggle-button`}>
      <DbIcon type={value} />
      <Typography variant="body1">{humanizeDbType(value)}</Typography>
    </ToggleCard>
  );
};

export default DbToggleCard;
