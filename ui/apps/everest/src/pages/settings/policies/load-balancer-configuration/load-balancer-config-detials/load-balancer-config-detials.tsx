import { useCallback, useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import ConfigDetails from './single-config-table';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { Box, Button, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useLoadBalancerConfig } from 'hooks/api/load-balancer';
import SaveIcon from '@mui/icons-material/Save';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { messages } from '../load-balancer.messages';
import { useRBACPermissionRoute, useRBACPermissions } from 'hooks/rbac/rbac';
import {
  EVEREST_READ_ONLY_FINALIZER,
  LOAD_BALANCER_ANNOTATION_REGEX,
} from 'consts';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';
import { useUpdateEntityWithConflictRetry } from 'hooks';
import { updateLoadBalancerConfigFn } from 'api/loadBalancer';

const convertConfigToFormValues = (config: LoadBalancerConfig) => {
  const entries = Object.entries(config.spec.annotations || {});
  if (entries.length === 0) {
    return [
      {
        key: '',
        value: '',
      },
    ];
  }
  return entries.map(([key, value]) => ({
    key,
    value,
  }));
};

const LoadBalancerConfigDetails = () => {
  const navigate = useNavigate();

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
  const [isSaved, setIsSaved] = useState(true);
  const [annotationsArray, setAnnotationsArray] = useState<
    Record<string, string>[]
  >([]);
  const { data: config, refetch: refetchConfig } = useLoadBalancerConfig(
    configName,
    {
      refetchInterval: 3000,
    }
  );
  const methods = useForm({
    defaultValues: {
      annotations:
        annotationsArray.length > 0
          ? annotationsArray
          : [
              {
                key: '',
                value: '',
              },
            ],
    },
    mode: 'onChange',
    resolver: zodResolver(
      z
        .object({
          annotations: z.array(
            z.object({
              key: z.string().regex(LOAD_BALANCER_ANNOTATION_REGEX, {
                message: 'Invalid annotation key',
              }),
              value: z.string().min(1, { message: 'Value is required' }),
            })
          ),
        })
        .superRefine(({ annotations }, ctx) => {
          const duplicateIndexes: Record<string, number[]> = {};

          annotations.forEach(({ key }, index) => {
            if (duplicateIndexes[key]) {
              duplicateIndexes[key].push(index);
            } else {
              duplicateIndexes[key] = [index];
            }
          });

          Object.entries(duplicateIndexes).forEach(([, indexes]) => {
            if (indexes.length >= 2) {
              indexes.slice(1).forEach((index) => {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ['annotations', index, 'key'],
                  message: 'Duplicate annotation key',
                });
              });
            }
          });
        })
    ),
  });
  const { mutate: updateAnnotations } = useUpdateEntityWithConflictRetry(
    ['load-balancer-config', configName],
    (newConfig) => updateLoadBalancerConfigFn(configName, newConfig),
    config?.metadata.generation || 0,
    refetchConfig,
    (_, newData) => newData
  );

  const isDefault = config?.metadata.finalizers?.includes(
    EVEREST_READ_ONLY_FINALIZER
  );

  useEffect(() => {
    if (config && config.spec.annotations) {
      const newAnnotationsArray = convertConfigToFormValues(config);
      setAnnotationsArray(newAnnotationsArray);
      methods.setValue('annotations', newAnnotationsArray);
    }
  }, [config, methods]);

  const handleAddAnnotations = useCallback(() => {
    const annotationsObject = methods.getValues('annotations');
    const res: Record<string, string> = {};

    annotationsObject.forEach(({ key, value }) => {
      if (key && value) {
        res[key] = value;
      }
    });

    updateAnnotations({
      metadata: config?.metadata || {
        name: configName,
        resourceVersion: config?.metadata.resourceVersion || '',
        finalizers: config?.metadata.finalizers || [],
        generation: config?.metadata.generation || 0,
      },
      spec: {
        annotations: res,
      },
    });
  }, [config, methods, updateAnnotations, configName]);

  if (!config) {
    return <LoadingPageSkeleton />;
  }

  return (
    <>
      <Button
        sx={{ mt: 0, mb: 2 }}
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
      >
        Back
      </Button>
      <FormProvider {...methods}>
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
            <Button
              disabled={!isSaved && !!methods.formState.errors.annotations}
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
              {isSaved
                ? messages.details.editButton
                : messages.details.saveButton}
            </Button>
          )}
        </Box>
        <ConfigDetails
          config={config}
          isDefault={isDefault}
          isSaved={isSaved}
        />
      </FormProvider>
    </>
  );
};

export default LoadBalancerConfigDetails;
