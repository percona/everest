import { ReactNode } from 'react';
import { FormGroup } from '@mui/material';
import { useLoadBalancerConfig } from 'hooks/api/load-balancer';
import { FormProvider, useForm } from 'react-hook-form';
import LoadBalancerTable from 'components/load-balancer-table';
import { MultipleTextInput } from '@percona/ui-lib';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';

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
  isDefault?: boolean;
  annotationsArray: Record<string, string>[];
  handleSetAnnotations: (annotations: Record<string, string>[]) => void;
  handleDelete?: (annotation: [string, string]) => void;
}

const ConfigDetails = ({
  configName,
  isSaved,
  isDefault,
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
      {isSaved || isDefault ? (
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
