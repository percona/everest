import LoadBalancerTable from 'components/load-balancer-table';
import { MultipleTextInput } from '@percona/ui-lib';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';
import { useFormContext } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

interface ConfigDetailsProps {
  config: LoadBalancerConfig;
  isSaved?: boolean;
  isDefault?: boolean;
}

const ConfigDetails = ({ config, isSaved, isDefault }: ConfigDetailsProps) => {
  const { trigger, getValues } = useFormContext();

  const { state } = useLocation();

  if (!config) {
    return <LoadingPageSkeleton />;
  }

  const triggerValidationAfterRemoval = (nrOfFields: number) => {
    for (let i = 0; i < nrOfFields; i++) {
      if (getValues(`annotations.${i}.key`)) {
        trigger(`annotations.${i}.key`);
      }
    }
  };

  const triggerValidationAfterChange = (nrOfFields: number, index: number) => {
    for (let i = 0; i < nrOfFields; i++) {
      if (i !== index && getValues(`annotations.${i}.key`)) {
        trigger(`annotations.${i}.key`);
      }
    }
  };

  return (
    <>
      {!state.createdConfig && (isSaved || isDefault) ? (
        <LoadBalancerTable config={config} />
      ) : (
        <MultipleTextInput
          fieldName="annotations"
          onRemove={(nrOfFields) => {
            triggerValidationAfterRemoval(nrOfFields);
          }}
          onChange={(nrOfFields, index, field) => {
            trigger(`annotations.${index}.${field}`);
            setTimeout(() => {
              triggerValidationAfterChange(nrOfFields, index);
            }, 10);
          }}
        />
      )}
    </>
  );
};

export default ConfigDetails;
