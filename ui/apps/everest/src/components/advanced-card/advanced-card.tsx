import React from 'react';
import { Typography, Box } from '@mui/material';
import RoundedBox from 'components/rounded-box';

const Header = ({
  title,
  controlComponent,
}: {
  title: string;
  controlComponent: React.ReactNode;
}) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
    <Typography variant="sectionHeading">{title}</Typography>
    <Box
      sx={{
        flexBasis: '20%',
        maxWidth: '40%',
        textAlign: 'right',
      }}
    >
      {controlComponent}
    </Box>
  </Box>
);

type AdvancedCardProps = {
  title: string;
  description: string | React.ReactNode;
  controlComponent: React.ReactNode;
};

const AdvancedCard: React.FC<AdvancedCardProps> = ({
  title,
  description,
  controlComponent,
}) => {
  return (
    <RoundedBox
      title={<Header title={title} controlComponent={controlComponent} />}
    >
      {typeof description === 'string' ? (
        <Typography variant="caption">{description}</Typography>
      ) : (
        description
      )}
    </RoundedBox>
  );
};

export default AdvancedCard;
