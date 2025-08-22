import { Box, Typography } from '@mui/material';
import LoadBalancerConfigurationList from './configurations-list';
import { messages } from './load-balancer.messages';
import BackTo from '../shared/back-to';

const LoadBalancerConfiguration = () => {
  return (
    <Box>
      <BackTo to="/settings/policies" prevPage="all policies" />
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        {messages.title}
      </Typography>
      <LoadBalancerConfigurationList />
    </Box>
  );
};

export default LoadBalancerConfiguration;
