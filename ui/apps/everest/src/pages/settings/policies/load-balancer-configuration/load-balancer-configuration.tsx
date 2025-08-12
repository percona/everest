import { Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';

const LoadBalancerConfiguration = () => {
  return (
    <Box>
      <Link to="/settings/policies" style={{ textDecoration: 'none' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'start',
            alignItems: 'center',
            gap: 1,
            ml: 2,
          }}
        >
          <ArrowBackIcon sx={{ color: 'primary.main' }} />
          <Typography variant="body2" color="primary.main">
            Back to all policies
          </Typography>
        </Box>
      </Link>
      <Typography variant="h6" sx={{ mt: 2, mb: 3 }}>
        Load Balancer Configuration
      </Typography>
    </Box>
  );
};

export default LoadBalancerConfiguration;
