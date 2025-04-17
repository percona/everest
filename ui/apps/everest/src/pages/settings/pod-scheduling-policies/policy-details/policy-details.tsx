import { Box, Button, IconButton, Skeleton, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate, useParams } from 'react-router-dom';
import { usePodSchedulingPolicy } from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();

  const {
    isLoading,
    isError,
    data: policy,
  } = usePodSchedulingPolicy(policyName);

  if (isLoading) {
    return (
      <>
        <Skeleton variant="rectangular" />
        <Skeleton variant="rectangular" />
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton variant="rectangular" />
      </>
    );
  }

  if (isError) {
    return <NoMatch />;
  }

  return (
    <>
      <Button
        sx={{ mt: 2 }}
        startIcon={<ArrowBack />}
        onClick={() =>
          navigate(`/settings/${SettingsTabs.podSchedulingPolicies}`)
        }
      >
        Back
      </Button>
      <Box display="flex" alignItems="center" gap={1} mt={3}>
        <Typography variant="h6">{policyName} / MySQL</Typography>
        <IconButton
          size="medium"
          aria-label="edit"
          onClick={() => {}}
          data-testid="edit-policy-button"
          sx={{
            position: 'relative',
            bottom: '2px',
          }}
        >
          <Edit />
        </IconButton>
      </Box>
    </>
  );
};

export default PolicyDetails;
