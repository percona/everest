import { ReactNode } from 'react';
import { FormGroup } from '@mui/material';
import { useLoadBalancerConfig } from 'hooks/api/load-balancer';
import { FormProvider, useForm } from 'react-hook-form';
import LoadBalancerTable from 'components/load-balancer-table';
import { MultipleTextInput } from '@percona/ui-lib';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { AnnotationType } from 'shared-types/loadbalancer.types';

const FormProviderWrapper = ({
  children,
  defaultValues,
}: {
  children: ReactNode;
  defaultValues?: Record<string, string>[];
}) => {
  const methods = useForm({
    defaultValues: {
      annotations: defaultValues || [],
    },
  });

  return (
    <FormProvider {...methods}>
      <FormGroup>{children}</FormGroup>
    </FormProvider>
  );
};

interface ConfigDetailsProps {
  configName: string;
  isSaved?: boolean;
  annotationsArray: Record<string, string>[];
  handleSetAnnotations: (annotations: AnnotationType[]) => void;
  handleDelete?: (annotation: [string, string]) => void;
}

const ConfigDetails = ({
  configName,
  isSaved,
  annotationsArray,
  handleSetAnnotations,
  handleDelete,
}: ConfigDetailsProps) => {
  const { data: config } = useLoadBalancerConfig(configName, {
    refetchInterval: 3000,
  });

  if (!config) {
    return <LoadingPageSkeleton />;
  }

  return (
    <>
      {isSaved ? (
        <LoadBalancerTable config={config} />
      ) : (
        <FormProviderWrapper defaultValues={annotationsArray}>
          <MultipleTextInput
            fieldName="annotations"
            handleDelete={handleDelete}
            getValues={handleSetAnnotations}
          />
        </FormProviderWrapper>
      )}
    </>
  );
};

export default ConfigDetails;
