import { Box, Typography } from '@mui/material';
import { FormCard } from 'components/form-card';
import { policies } from './policies.messages';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';

const Policies = () => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="body2" py={2}>
        Define and manage policies that control how users can provision
        clusters.
      </Typography>
      {policies.map((policy) => (
        <FormCard
          key={policy.name}
          title={policy.name}
          description={policy.description}
          controlComponent={
            <Link to={policy.redirectUrl} style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'end',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="primary.main">
                  Configure
                </Typography>
                <ArrowForwardIcon sx={{ color: 'primary.main' }} />
              </Box>
            </Link>
          }
        />
      ))}
    </Box>
  );
};

export default Policies;
