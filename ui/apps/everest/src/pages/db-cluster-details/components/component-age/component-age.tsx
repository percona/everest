import { Tooltip, Typography, TypographyProps } from '@mui/material';
import { format, formatDistanceToNowStrict, isValid } from 'date-fns';
import { DATE_FORMAT } from 'consts';

export type ComponentAgeProps = {
  date: string;
  render?: (date?: string) => React.ReactNode;
  typographyProps?: TypographyProps;
};

const ComponentAge = ({ date, render, typographyProps }: ComponentAgeProps) => {
  const dateObj = new Date(date);

  const formattedDate = isValid(dateObj)
    ? formatDistanceToNowStrict(dateObj)
    : '';

  return (
    <Tooltip
      title={isValid(dateObj) ? `Started at ${format(date, DATE_FORMAT)}` : ''}
      placement="right"
      arrow
    >
      <Typography variant="caption" color="text.secondary" {...typographyProps}>
        {render ? render(formattedDate) : formattedDate}
      </Typography>
    </Tooltip>
  );
};

export default ComponentAge;
