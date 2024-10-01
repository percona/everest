// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useState } from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  BorderColor,
  PauseCircleOutline,
  DeleteOutline,
} from '@mui/icons-material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { DbActionsProps } from './db-actions.types';
import { useRBACPermissions } from 'hooks/rbac';
import { Link } from 'react-router-dom';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { Messages } from './db-actions.messages';
import { ArrowDropDownIcon } from '@mui/x-date-pickers/icons';
import { RestoreDbModal } from 'modals';

export const DbActions = ({
  isDetailView = false,
  dbCluster,
  setIsNewClusterMode,
  handleDbRestart,
  handleDbSuspendOrResumed,
  handleDeleteDbCluster,
  isPaused,
  handleRestoreDbCluster,
  openDetailsDialog,
  setOpenDetailsDialog,
  isNewClusterMode,
  openRestoreDialog,
  handleCloseRestoreDialog,
}: DbActionsProps) => {
  const { canUpdate, canDelete } = useRBACPermissions(
    'database-clusters',
    `${dbCluster.metadata.namespace}/${dbCluster.metadata.name}`
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const dbClusterName = dbCluster.metadata.name;
  const namespace = dbCluster.metadata.namespace;
  const restoring = dbCluster.status?.status === DbClusterStatus.restoring;
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = (event: React.MouseEvent) => {
    setAnchorEl(null);
    event.stopPropagation();
  };

  const { canCreate: canCreateClusters } = useRBACPermissions(
    'database-clusters',
    `${dbCluster.metadata.namespace}/*`
  );

  const { canCreate: canCreateRestore } = useRBACPermissions(
    'database-cluster-restores',
    `${namespace}/*`
  );

  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${namespace}/${dbClusterName}`
  );

  const canRestore = canCreateRestore && canReadCredentials;
  const canCreateClusterFromBackup = canRestore && canCreateClusters;

  const sx = {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    px: 2,
    py: '10px',
  };

  return (
    <Stack>
      <Box>
        {isDetailView ? (
          <Button
            id="actions-button"
            data-testid="actions-button"
            aria-controls={open ? 'actions-button-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
            variant="text"
            size="small"
            endIcon={<ArrowDropDownIcon />}
          >
            Actions
          </Button>
        ) : (
          <IconButton
            data-testid="row-actions-menu-button"
            aria-haspopup="true"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
          >
            <MoreHorizIcon />
          </IconButton>
        )}

        <Menu
          id="actions-button-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={closeMenu}
          onClick={(event) => {
            closeMenu(event);
          }}
          MenuListProps={{
            'aria-labelledby': 'row-actions-button',
          }}
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
              }}
              sx={sx}
            >
              <RestartAltIcon /> {Messages.menuItems.restart}
            </MenuItem>
          )}
          {canCreateClusterFromBackup && (
            <MenuItem
              data-testid={`${dbClusterName}-create-new-db-from-backup`}
              disabled={restoring}
              key={1}
              onClick={() => {
                setIsNewClusterMode(true);
                handleRestoreDbCluster(dbCluster);
              }}
              sx={sx}
            >
              <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
            </MenuItem>
          )}
          {canRestore && (
            <MenuItem
              data-testid={`${dbClusterName}-restore`}
              disabled={restoring}
              key={3}
              onClick={() => {
                setIsNewClusterMode(false);
                handleRestoreDbCluster(dbCluster);
              }}
              sx={sx}
            >
              <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
            </MenuItem>
          )}
          {setOpenDetailsDialog &&
            openDetailsDialog &&
            dbCluster?.status?.details && (
              <MenuItem
                key={6}
                sx={sx}
                onClick={() => {
                  setOpenDetailsDialog(true);
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
                console.log('handleDelete');
                handleDeleteDbCluster(dbCluster);
              }}
              sx={sx}
            >
              <DeleteOutline /> {Messages.menuItems.delete}
            </MenuItem>
          )}
        </Menu>
      </Box>
      <>
        {openRestoreDialog && (
          <RestoreDbModal
            dbCluster={dbCluster}
            namespace={dbCluster.metadata.namespace}
            isNewClusterMode={isNewClusterMode}
            isOpen={openRestoreDialog}
            closeModal={handleCloseRestoreDialog}
          />
        )}
        {/* {openDetailsDialog && dbCluster?.status?.details && (
       <DbStatusDetailsDialog
         isOpen={openDetailsDialog}
         closeModal={handleCloseDetailsDialog}
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
         dialogContent={Messages.deleteModal.content(
           dbCluster.metadata.name
         )}
         submitMessage={Messages.deleteModal.confirmButtom}
         checkboxMessage={Messages.deleteModal.checkboxMessage}
         disableCheckbox={disableKeepDataCheckbox}
         tooltipText={Messages.deleteModal.disabledCheckboxForPGTooltip}
         hideCheckbox={hideCheckbox}
       />
     )} */}
      </>
    </Stack>
  );
};

export default DbActions;
