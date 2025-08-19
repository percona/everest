import { DbEngineType } from '@percona/types';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import LoadBalancerTable from 'components/load-balancer-table';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';

interface LoadBalancerDialogProps {
  engineType: DbEngineType;
  config: LoadBalancerConfig;
  handleClose: () => void;
}

const LoadBalancerDialog = ({
  config,
  handleClose,
}: LoadBalancerDialogProps) => {
  return (
    <ConfirmDialog
      open
      selectedId="load-balancer-config-dialog"
      headerMessage={config.metadata?.name ?? ''}
      closeModal={handleClose}
      handleConfirm={handleClose}
      submitMessage="OK"
      maxWidth="md"
    >
      <LoadBalancerTable config={config} />
    </ConfirmDialog>
  );
};

export default LoadBalancerDialog;
