import { Typography } from '@mui/material';
import { UpgradeModalProps } from './types';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { Messages } from './messages';

const UpgradeModal = ({
  open,
  onClose,
  onConfirm,
  namespace,
  dbType,
  newVersion,
}: UpgradeModalProps) => {
  // const [showVersions, setShowVersions] = useState(false);

  return (
    <ConfirmDialog
      isOpen={open}
      selectedId={dbType}
      closeModal={onClose}
      headerMessage="Operator upgrade"
      submitMessage="OK"
      handleConfirm={onConfirm}
    >
      <Typography variant="body1">
        {Messages.upgradeConfirmation(dbType, namespace, newVersion)}
      </Typography>
    </ConfirmDialog>
  );
};

export default UpgradeModal;
