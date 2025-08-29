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
import { useQueryClient } from '@tanstack/react-query';
import { useRBACPermissionRoute, useRBACPermissions } from 'hooks/rbac/rbac';
import { EVEREST_READ_ONLY_FINALIZER } from 'consts';

const LoadBalancerConfigDetails = () => {
  const match = useMatch(
    '/settings/policies/load-balancer-configuration/:configName'
  );
  const configName = match?.params.configName || '';

  useRBACPermissionRoute([
    {
      action: 'read',
      resource: 'load-balancer-configs',
      specificResources: [configName],
    },
  ]);

  const { canUpdate } = useRBACPermissions(
    'load-balancer-configs',
    `${configName}`
  );

  const { data: config } = useLoadBalancerConfig(configName, {
    refetchInterval: 3000,
  });

  const isDefault = config?.metadata.finalizers?.includes(
    EVEREST_READ_ONLY_FINALIZER
  );

  const entries = useMemo(() => {
    if (config && config.spec.annotations) {
      return Object.entries(config.spec.annotations);
    }
    return [];
  }, [config]);

  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [annotationsArray, setAnnotationsArray] = useState<
    Record<string, string>[]
  >(
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
        setIsSaved(true);
        setIsSaving(false);
      },
      onError: () => {
        setIsSaving(false);
      },
    }
  );

  const handleSetAnnotations = useCallback(
    (annotations: Record<string, string>[]) => {
      setAnnotationsArray(annotations);
    },
    []
  );

  const handleAddAnnotations = useCallback(() => {
    const annotationsObject = annotationsArray.reduce(
      (acc, { key, value }) => {
        if (key && key.trim() !== '') {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    if (config) {
      setIsSaving(true);
      updateAnnotations({
        ...config,
        spec: {
          annotations: annotationsObject,
        },
      });
    }
  }, [annotationsArray, config, updateAnnotations]);

  const handleDelete = useCallback((annotation: [string, string]) => {
    setAnnotationsArray((prev) =>
      prev.filter(
        (item) => !(item.key === annotation[0] && item.value === annotation[1])
      )
    );
  }, []);

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
        {canUpdate && !isDefault && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isSaved && (
              <Button
                variant="outlined"
                size="medium"
                onClick={() => {
                  setIsSaved(true);
                  setAnnotationsArray(
                    entries.length
                      ? entries.map(([key, value]) => ({
                          key,
                          value,
                        }))
                      : []
                  );
                }}
                disabled={isSaving}
                sx={{ ml: 2 }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant={isSaved ? 'outlined' : 'contained'}
              size="medium"
              onClick={() => {
                if (!isSaved) {
                  handleAddAnnotations();
                } else {
                  setIsSaved(false);
                  setAnnotationsArray(
                    entries.length
                      ? entries.map(([key, value]) => ({
                          key,
                          value,
                        }))
                      : []
                  );
                }
              }}
              disabled={isSaving}
              sx={{ ml: 2 }}
              data-testid={`edit-button-${configName}`}
              startIcon={isSaved ? <EditOutlinedIcon /> : <SaveIcon />}
            >
              {isSaved
                ? messages.details.editButton
                : isSaving
                  ? 'Saving...'
                  : messages.details.saveButton}
            </Button>
          </Box>
        )}
      </Box>
      {!isSaved && (
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ mt: 1, ml: 2 }}
        >
          You have unsaved changes. Click Save to apply changes or Cancel to
          discard them.
        </Typography>
      )}
      <ConfigDetails
        configName={configName}
        isDefault={isDefault}
        isSaved={isSaved}
        annotationsArray={annotationsArray}
        handleSetAnnotations={handleSetAnnotations}
        handleDelete={handleDelete}
      />
    </>
  );
};

export default LoadBalancerConfigDetails;
