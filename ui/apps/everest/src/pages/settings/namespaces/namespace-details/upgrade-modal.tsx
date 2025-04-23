import { Typography } from '@mui/material';
import { UpgradeModalProps } from './types';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { Messages } from './messages';

const UpgradeModal = ({
  open,
  onClose,
  onConfirm,
  namespace,
  operatorsUpgradeTasks,
}: UpgradeModalProps) => {
  return (
    <ConfirmDialog
      open={open}
      cancelMessage="Cancel"
      selectedId={namespace}
      closeModal={onClose}
      headerMessage="Upgrade Operators"
      submitMessage="Upgrade"
      handleConfirm={onConfirm}
    >
      <Typography variant="body1">
        {Messages.upgradeConfirmation(namespace)}
        <br />
        The following upgrades will take place:
      </Typography>
      <ul>
        {operatorsUpgradeTasks.map((task) => (
          <li key={task.name}>
            {task.name} v{task.currentVersion} will be upgraded to v
            {task.targetVersion}
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
};

export default UpgradeModal;
