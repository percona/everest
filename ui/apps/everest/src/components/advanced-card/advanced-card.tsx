import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type AdvancedCardProps = {
  title: string;
  description: string | React.ReactNode;
  controlComponent: React.ReactNode;
  optionalRenderComponent?: React.ReactNode;
};

const AdvancedCard: React.FC<AdvancedCardProps> = ({
  title,
  description,
  controlComponent,
  optionalRenderComponent,
}) => {
  return (
    <Card variant="outlined" sx={{ marginBottom: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap="16px">
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            {title}
          </Typography>
          <Box sx={{ textAlign: 'right', ml: 'auto' }}>{controlComponent}</Box>
        </Box>
        {typeof description === 'string' ? (
          <Typography variant="body2" color="textSecondary" mt={1}>
            {description}
          </Typography>
        ) : (
          <Box mt={1}>{description}</Box>
        )}
        {optionalRenderComponent && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              {optionalRenderComponent}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedCard;
