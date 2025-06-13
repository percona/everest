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
import { Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PauseCircleOutline, DeleteOutline } from '@mui/icons-material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { DbActionsProps } from './db-actions.types';
import { useRBACPermissions } from 'hooks/rbac';
import { Messages } from './db-actions.messages';
import { ArrowDropDownIcon } from '@mui/x-date-pickers/icons';
import DbActionsModals from './db-actions-modals';
import { useDbActions } from 'hooks';
import { shouldDbActionsBeBlocked } from 'utils/db';
import { useLocation } from 'react-router-dom';

export const DbActions = ({
  isDetailView = false,
  dbCluster,
  cluster: clusterProp,
}: DbActionsProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isNewClusterMode, setIsNewClusterMode] = useState(false);
  const location = useLocation();
  const cluster = clusterProp || location.state?.cluster || 'in-cluster';

  const {
    openRestoreDialog,
    handleCloseRestoreDialog,
    handleDbRestart,
    handleDeleteDbCluster,
    isPaused,
    openDeleteDialog,
    handleConfirmDelete,
    handleCloseDeleteDialog,
    openDetailsDialog,
    handleOpenDbDetailsDialog,
    handleCloseDetailsDialog,
    handleDbSuspendOrResumed,
    handleRestoreDbCluster,
    deleteMutation,
  } = useDbActions(dbCluster, cluster);
  const open = Boolean(anchorEl);
  const dbClusterName = dbCluster.metadata.name;
  const namespace = dbCluster.metadata.namespace;
  const actionsBlocked = shouldDbActionsBeBlocked(dbCluster.status?.status);
  const hasSchedules = !!(
    dbCluster.spec.backup && (dbCluster.spec.backup.schedules || []).length > 0
  );
  const monitoringEnabled = !!(
    dbCluster.spec.monitoring && dbCluster.spec.monitoring.monitoringConfigName
  );
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  const { canUpdate, canDelete } = useRBACPermissions(
    'database-clusters',
    `${dbCluster.metadata.namespace}/${dbCluster.metadata.name}`
  );

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

  const { canCreate: canCreateBackups } = useRBACPermissions(
    'database-cluster-backups',
    `${namespace}/${dbClusterName}`
  );

  const { canRead: canReadMonitoring } = useRBACPermissions(
    'monitoring-instances',
    `${namespace}/${dbClusterName}`
  );

  const canRestore = canCreateRestore && canReadCredentials;
  const noActionAvailable = !canUpdate && !canDelete && !canRestore;
  let canCreateClusterFromBackup = canRestore && canCreateClusters;

  if (hasSchedules) {
    canCreateClusterFromBackup = canCreateClusterFromBackup && canCreateBackups;
  }

  if (monitoringEnabled) {
    canCreateClusterFromBackup =
      canCreateClusterFromBackup && canReadMonitoring;
  }

  const sx = {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    px: 2,
    py: '10px',
  };

  if (noActionAvailable) {
    return null;
  }

  return (
    <>
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
            size="large"
            endIcon={<ArrowDropDownIcon />}
          >
            Actions
          </Button>
        ) : (
          <IconButton
            data-testid="actions-menu-button"
            aria-haspopup="true"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
          >
            <MoreHorizIcon />
          </IconButton>
        )}

        <Menu
          id="actions-button"
          anchorEl={anchorEl}
          open={open}
          onClose={closeMenu}
          onClick={closeMenu}
          MenuListProps={{
            'aria-labelledby': 'row-actions-button',
          }}
        >
          {canUpdate && (
            <MenuItem
              disabled={actionsBlocked}
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
              disabled={actionsBlocked}
              key={1}
              onClick={() => {
                setIsNewClusterMode(true);
                handleRestoreDbCluster();
              }}
              sx={sx}
            >
              <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
            </MenuItem>
          )}
          {canRestore && (
            <MenuItem
              data-testid={`${dbClusterName}-restore`}
              disabled={actionsBlocked}
              key={3}
              onClick={() => {
                setIsNewClusterMode(false);
                handleRestoreDbCluster();
              }}
              sx={sx}
            >
              <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
            </MenuItem>
          )}
          {isDetailView && dbCluster?.status?.details && (
            <MenuItem
              key={6}
              sx={sx}
              onClick={() => {
                handleOpenDbDetailsDialog();
              }}
            >
              <VisibilityOutlinedIcon /> {Messages.menuItems.dbStatusDetails}
            </MenuItem>
          )}
          {canUpdate && (
            <MenuItem
              disabled={actionsBlocked}
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
              disabled={dbCluster?.status?.status === 'deleting'}
              data-testid={`${dbClusterName}-delete`}
              key={5}
              onClick={() => {
                handleDeleteDbCluster();
              }}
              sx={sx}
            >
              <DeleteOutline /> {Messages.menuItems.delete}
            </MenuItem>
          )}
        </Menu>
      </Box>
      <DbActionsModals
        dbCluster={dbCluster}
        isNewClusterMode={isNewClusterMode}
        openRestoreDialog={openRestoreDialog}
        handleCloseRestoreDialog={handleCloseRestoreDialog}
        openDeleteDialog={openDeleteDialog}
        handleCloseDeleteDialog={handleCloseDeleteDialog}
        handleConfirmDelete={handleConfirmDelete}
        openDetailsDialog={openDetailsDialog}
        handleCloseDetailsDialog={handleCloseDetailsDialog}
        deleteMutation={deleteMutation}
      />
    </>
  );
};

export default DbActions;