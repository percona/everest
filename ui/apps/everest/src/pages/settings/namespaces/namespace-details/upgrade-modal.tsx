import { useState } from 'react';
import { Button, Typography } from '@mui/material';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined';
import { UpgradeModalProps } from './types';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';

const UpgradeModal = ({
  open,
  onClose,
  onConfirm,
  namespace,
  dbType,
  newVersion,
  supportedVersions,
}: UpgradeModalProps) => {
  const [showVersions, setShowVersions] = useState(false);

  return (
    <ConfirmDialog
      isOpen={open}
      selectedId=""
      closeModal={onClose}
      headerMessage="Operator upgrade"
      handleConfirm={onConfirm}
    >
      <Typography variant="body1">
        Are you sure you want to upgrade {dbType} operator in namespace{' '}
        {namespace} to version {newVersion}?
      </Typography>
      <Button
        size="small"
        endIcon={
          showVersions ? (
            <KeyboardArrowUpOutlined />
          ) : (
            <KeyboardArrowDownOutlinedIcon />
          )
        }
        onClick={() => setShowVersions((val) => !val)}
      >
        See supported database versions
      </Button>
      {showVersions && <Typography>{supportedVersions.join(';')}</Typography>}
    </ConfirmDialog>
  );
};

export default UpgradeModal;
