import { ReactNode } from 'react';
import { FormGroup } from '@mui/material';
import { useLoadBalancerConfig } from 'hooks/api/load-balancer';
import { FormProvider, useForm } from 'react-hook-form';
import LoadBalancerTable from 'components/load-balancer-table';
import { MultipleTextInput } from '@percona/ui-lib';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { AnnotationType } from 'shared-types/loadbalancer.types';

interface ConfigDetailsProps {
  configName: string;
  isSaved?: boolean;
  handleSetAnnotations: (annotations: AnnotationType[]) => void;
}

const FormProviderWrapper = ({ children }: { children: ReactNode }) => {
  const methods = useForm({
    defaultValues: {},
  });

  return (
    <FormProvider {...methods}>
      <FormGroup>{children}</FormGroup>
    </FormProvider>
  );
};

const ConfigDetails = ({
  configName,
  isSaved,
  handleSetAnnotations,
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
        <FormProviderWrapper>
          <MultipleTextInput
            fieldName="annotations"
            getValues={handleSetAnnotations}
          />
        </FormProviderWrapper>
      )}
    </>
  );
};

export default ConfigDetails;
