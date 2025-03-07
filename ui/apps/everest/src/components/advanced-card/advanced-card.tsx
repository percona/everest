import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type AdvancedCardProps = {
  title: string;
  description: string | React.ReactNode;
  controlComponent: React.ReactNode;
  gapFromText?: number;
};

const AdvancedCard: React.FC<AdvancedCardProps> = ({
  title,
  description,
  controlComponent,
  gapFromText = 48,
}) => {
  return (
    <Card variant="outlined" sx={{ marginBottom: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={gapFromText}>
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            {title}
          </Typography>
          <Box sx={{ flexGrow: 2, textAlign: 'right' }}>{controlComponent}</Box>
        </Box>
        {typeof description === 'string' ? (
          <Typography variant="body2" color="textSecondary" mt={1}>
            {description}
          </Typography>
        ) : (
          <Box mt={1}>{description}</Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedCard;
