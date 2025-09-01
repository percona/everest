import LoadBalancerTable from 'components/load-balancer-table';
import { MultipleTextInput } from '@percona/ui-lib';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';

interface ConfigDetailsProps {
  config: LoadBalancerConfig;
  isSaved?: boolean;
  isDefault?: boolean;
}

const ConfigDetails = ({ config, isSaved, isDefault }: ConfigDetailsProps) => {
  if (!config) {
    return <LoadingPageSkeleton />;
  }

  return (
    <>
      {isSaved || isDefault ? (
        <LoadBalancerTable config={config} />
      ) : (
        <MultipleTextInput fieldName="annotations" />
      )}
    </>
  );
};

export default ConfigDetails;
