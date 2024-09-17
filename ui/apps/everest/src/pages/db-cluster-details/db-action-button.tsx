import {
  BorderColor,
  DeleteOutline,
  PauseCircleOutline,
} from '@mui/icons-material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import { useDbActions } from 'hooks/api/db-cluster/useDbActions';
import { useDeleteDbCluster } from 'hooks/api/db-cluster/useDeleteDbCluster';
import { RestoreDbModal } from 'modals';
import { Messages } from 'pages/databases/dbClusterView.messages';
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Messages as ClusterDetailsMessages } from './db-cluster-details.messages';
import { DbCluster, DbClusterStatus } from 'shared-types/dbCluster.types';
import { CustomConfirmDialog } from 'components/custom-confirm-dialog';
import { useDbBackups } from 'hooks/api/backups/useBackups';
import { DbEngineType } from '@percona/types';
import DbStatusDetailsDialog from 'modals/db-status-details-dialog/db-status-details-dialog';
import { useRBACPermissions } from 'hooks/rbac';

export const DbActionButton = ({
  dbCluster,
  canUpdate,
  canDelete,
}: {
  dbCluster: DbCluster;
  canUpdate: boolean;
  canDelete: boolean;
}) => {
  const { dbClusterName, namespace = '' } = useParams();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openRestoreDbModal, setOpenRestoreDbModal] = useState(false);
  const [openDbStatusDetailsModal, setOpenDbStatusDetailsModal] =
    useState(false);
  const [isNewClusterMode, setIsNewClusterMode] = useState(false);
  const isOpen = !!anchorEl;
  const restoring = dbCluster.status?.status === DbClusterStatus.restoring;
  const {
    openDeleteDialog,
    handleConfirmDelete,
    handleDbRestart,
    handleDbSuspendOrResumed,
    handleDeleteDbCluster,
    handleCloseDeleteDialog,
    isPaused,
  } = useDbActions();
  const { isPending: deletingCluster } = useDeleteDbCluster();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleDelete = (keepBackupStorageData: boolean) => {
    handleConfirmDelete(keepBackupStorageData, '/databases');
  };

  const { data: backups = [] } = useDbBackups(dbClusterName!, namespace!, {
    enabled: !!dbClusterName,
    refetchInterval: 10 * 1000,
  });
  const disableKeepDataCheckbox =
    dbCluster?.spec.engine.type === DbEngineType.POSTGRESQL;
  const hideCheckbox = !backups.length;

  const { canCreate: canCreateRestore } = useRBACPermissions(
    'database-cluster-restores',
    `${namespace}/*`
  );

  //TODO: refactoring: move to component ?
  const sx = {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    px: 2,
    py: '10px',
  };

  return (
    <Box>
      <Button
        id="actions-button"
        data-testid="actions-button"
        aria-controls={isOpen ? 'actions-button-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : undefined}
        onClick={handleClick}
        variant="text"
        size="small"
        endIcon={<ArrowDropDownIcon />}
      >
        {ClusterDetailsMessages.dbActions}
      </Button>
      <Box>
        <Menu
          id="actions-button-menu"
          anchorEl={anchorEl}
          open={isOpen}
          onClose={closeMenu}
        >
          {canUpdate && (
            <MenuItem
              disabled={restoring}
              key={0}
              component={Link}
              to="/databases/edit"
              state={{ selectedDbCluster: dbClusterName, namespace }}
              sx={sx}
            >
              <BorderColor fontSize="small" /> {Messages.menuItems.edit}
            </MenuItem>
          )}
          {canUpdate && (
            <MenuItem
              disabled={restoring}
              key={2}
              onClick={() => {
                handleDbRestart(dbCluster);
                closeMenu();
              }}
              sx={sx}
            >
              <RestartAltIcon /> {Messages.menuItems.restart}
            </MenuItem>
          )}
          {canCreateRestore && (
            <MenuItem
              data-testid={`${dbClusterName}-create-new-db-from-backup`}
              disabled={restoring}
              key={1}
              onClick={() => {
                setIsNewClusterMode(true);
                setOpenRestoreDbModal(true);
                closeMenu();
              }}
              sx={sx}
            >
              <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
            </MenuItem>
          )}
          {canCreateRestore && (
            <MenuItem
              data-testid={`${dbClusterName}-restore`}
              disabled={restoring}
              key={3}
              onClick={() => {
                setIsNewClusterMode(false);
                setOpenRestoreDbModal(true);
                closeMenu();
              }}
              sx={sx}
            >
              <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
            </MenuItem>
          )}
          {dbCluster?.status?.details && (
            <MenuItem
              key={6}
              sx={sx}
              onClick={() => {
                setOpenDbStatusDetailsModal(true);
                closeMenu();
              }}
            >
              <VisibilityOutlinedIcon /> {Messages.menuItems.dbStatusDetails}
            </MenuItem>
          )}
          {canUpdate && (
            <MenuItem
              disabled={restoring}
              key={4}
              onClick={() => {
                handleDbSuspendOrResumed(dbCluster);
                closeMenu();
              }}
              sx={sx}
            >
              <PauseCircleOutline />{' '}
              {isPaused(dbCluster)
                ? Messages.menuItems.resume
                : Messages.menuItems.suspend}
            </MenuItem>
          )}
          {canDelete && (
            <MenuItem
              data-testid={`${dbClusterName}-delete`}
              key={5}
              onClick={() => {
                handleDeleteDbCluster(dbCluster);
                closeMenu();
              }}
              sx={sx}
            >
              <DeleteOutline /> {Messages.menuItems.delete}
            </MenuItem>
          )}
        </Menu>
      </Box>
      {openRestoreDbModal && (
        <RestoreDbModal
          dbCluster={dbCluster}
          namespace={namespace}
          isNewClusterMode={isNewClusterMode}
          isOpen={openRestoreDbModal}
          closeModal={() => setOpenRestoreDbModal(false)}
        />
      )}
      {openDbStatusDetailsModal && dbCluster?.status?.details && (
        <DbStatusDetailsDialog
          isOpen={openDbStatusDetailsModal}
          closeModal={() => setOpenDbStatusDetailsModal(false)}
          dbClusterDetails={dbCluster?.status?.details}
        />
      )}
      {openDeleteDialog && (
        <CustomConfirmDialog
          inputLabel={Messages.deleteModal.databaseName}
          inputPlaceholder={Messages.deleteModal.databaseName}
          isOpen={openDeleteDialog}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteModal.header}
          submitting={deletingCluster}
          selectedId={dbCluster.metadata.name || ''}
          handleConfirm={({ dataCheckbox: keepBackupStorageData }) =>
            handleDelete(keepBackupStorageData)
          }
          alertMessage={Messages.deleteModal.alertMessage}
          dialogContent={Messages.deleteModal.content(dbCluster.metadata.name)}
          submitMessage={Messages.deleteModal.confirmButtom}
          checkboxMessage={Messages.deleteModal.checkboxMessage}
          disableCheckbox={disableKeepDataCheckbox}
          tooltipText={Messages.deleteModal.disabledCheckboxForPGTooltip}
          hideCheckbox={hideCheckbox}
        />
      )}
    </Box>
  );
};
