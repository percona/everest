import { useState } from 'react';
import { useMatch } from 'react-router-dom';
import ConfigDetails from './single-config-table';
import BackTo from '../../shared/back-to';
import { Box, Button, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  useLoadBalancerConfig,
  useUpdateLoadBalancerConfig,
} from 'hooks/api/load-balancer';
import SaveIcon from '@mui/icons-material/Save';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { messages } from '../load-balancer.messages';
import { AnnotationType } from 'shared-types/loadbalancer.types';

const LoadBalancerConfigDetails = () => {
  const match = useMatch(
    '/settings/policies/load-balancer-configuration/:configName'
  );

  const configName = match?.params.configName || '';
  const [isSaved, setIsSaved] = useState(false);

  const { data: config } = useLoadBalancerConfig(configName, {
    refetchInterval: 3000,
  });

  const { mutate: updateAnnotations } = useUpdateLoadBalancerConfig(
    configName,
    'update-load-balancer-config'
  );

  const [annotationsArray, setAnnotationsArray] = useState<AnnotationType[]>(
    []
  );

  const handleSetAnnotations = (annotations: AnnotationType[]) => {
    setAnnotationsArray(annotations);
  };

  if (!config) {
    return <LoadingPageSkeleton />;
  }

  const handleAddAnnotations = () => {
    const annotationsObject = annotationsArray.reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    updateAnnotations({
      ...config,
      spec: {
        annotations: { ...config.spec.annotations, ...annotationsObject },
      },
    });
  };

  return (
    <>
      <BackTo
        to="/settings/policies/load-balancer-configuration"
        prevPage="Load Balancer configuration"
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          {configName}
        </Typography>
        <Button
          variant={isSaved ? 'outlined' : 'contained'}
          size="medium"
          onClick={() => {
            if (!isSaved) {
              handleAddAnnotations();
            }
            setIsSaved((prev) => !prev);
          }}
          sx={{ ml: 2 }}
          data-testid={`edit-button-${configName}`}
          startIcon={isSaved ? <EditOutlinedIcon /> : <SaveIcon />}
        >
          {isSaved ? messages.details.editButton : messages.details.saveButton}
        </Button>
      </Box>
      <ConfigDetails
        configName={configName}
        isSaved={isSaved}
        handleSetAnnotations={handleSetAnnotations}
      />
    </>
  );
};

export default LoadBalancerConfigDetails;
