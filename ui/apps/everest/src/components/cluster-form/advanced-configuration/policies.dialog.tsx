import { DbEngineType } from '@percona/types';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import PodSchedulingPoliciesTable from 'components/pod-scheduling-policies-table';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { dbPayloadToAffinityRules } from 'utils/db';

type Props = {
  engineType: DbEngineType;
  policy: PodSchedulingPolicy;
  handleClose: () => void;
};
const PoliciesDialog = ({ engineType, policy, handleClose }: Props) => {
  return (
    <ConfirmDialog
      open
      cancelMessage={undefined}
      selectedId="pod-scheduling-policies"
      headerMessage={policy.metadata.name}
      closeModal={handleClose}
      handleConfirm={handleClose}
      submitMessage="OK"
      maxWidth="xl"
    >
      <PodSchedulingPoliciesTable
        viewOnly
        rules={dbPayloadToAffinityRules(policy)}
        engineType={engineType}
      />
    </ConfirmDialog>
  );
};

export default PoliciesDialog;
