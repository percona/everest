import { useCallback, useMemo, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';

const LoadBalancerConfigDetails = () => {
  const match = useMatch(
    '/settings/policies/load-balancer-configuration/:configName'
  );
  const configName = match?.params.configName || '';

  const { data: config } = useLoadBalancerConfig(configName, {
    refetchInterval: 3000,
  });

  const entries = useMemo(() => {
    if (config && config.spec.annotations) {
      return Object.entries(config.spec.annotations);
    }
    return [];
  }, [config]);

  const [isSaved, setIsSaved] = useState(true);

  const [annotationsArray, setAnnotationsArray] = useState<AnnotationType[]>(
    entries.length
      ? entries.map(([key, value]) => ({
          key,
          value,
        }))
      : []
  );

  const queryClient = useQueryClient();
  const { mutate: updateAnnotations } = useUpdateLoadBalancerConfig(
    configName,
    'update-load-balancer-config',
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['load-balancer-config', configName],
        });
        queryClient.invalidateQueries({ queryKey: ['load-balancer-configs'] });
      },
    }
  );

  const handleSetAnnotations = useCallback((annotations: AnnotationType[]) => {
    setAnnotationsArray(annotations);
  }, []);

  const handleAddAnnotations = useCallback(() => {
    const annotationsObject = annotationsArray.reduce((acc, { key, value }) => {
      if (key) acc[key] = value;
      return acc;
    }, {} as AnnotationType);

    if (config) {
      updateAnnotations({
        ...config,
        spec: {
          annotations: { ...config.spec.annotations, ...annotationsObject },
        },
      });
    }
  }, [annotationsArray, config, updateAnnotations]);

  const handleDelete = useCallback(
    (annotation: [string, string]) => {
      if (config && config.spec.annotations) {
        const updatedAnnotations = { ...config.spec.annotations };
        delete updatedAnnotations[annotation[0]];

        updateAnnotations({
          ...config,
          spec: {
            annotations: updatedAnnotations,
          },
        });
      }
    },
    [config, updateAnnotations]
  );

  if (!config) {
    return <LoadingPageSkeleton />;
  }

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
        annotationsArray={annotationsArray}
        handleSetAnnotations={handleSetAnnotations}
        handleDelete={handleDelete}
      />
    </>
  );
};

export default LoadBalancerConfigDetails;
