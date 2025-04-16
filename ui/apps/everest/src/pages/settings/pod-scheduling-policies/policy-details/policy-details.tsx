import { Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate } from 'react-router-dom';

const PolicyDetails = () => {
  const navigate = useNavigate();

  return (
    <Button
      sx={{ mt: 2 }}
      startIcon={<ArrowBack />}
      onClick={() =>
        navigate(`/settings/${SettingsTabs.podSchedulingPolicies}`)
      }
    >
      Back
    </Button>
  );
};

export default PolicyDetails;
