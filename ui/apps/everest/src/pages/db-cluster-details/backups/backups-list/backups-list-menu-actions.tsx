import { MRT_Row } from 'material-react-table';
import { MenuItem } from '@mui/material';
import { Messages } from './backups-list.messages';
import AddIcon from '@mui/icons-material/Add';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetPermissions } from 'utils/useGetPermissions.ts';
import { DbCluster } from 'shared-types/dbCluster.types';
import { Backup, BackupStatus } from 'shared-types/backups.types';

export const BackupActionButtons = (
  row: MRT_Row<Backup>,
  restoring: boolean,
  handleDeleteBackup: (backupName: string) => void,
  handleRestoreBackup: (backupName: string) => void,
  handleRestoreToNewDbBackup: (backupName: string) => void,
  dbCluster: DbCluster
) => {
  const { canDelete } = useGetPermissions({
    resource: 'database-cluster-backups',
    specificResource: row.original.backupStorageName,
    namespace: dbCluster.metadata.namespace,
  });

  const { canUpdate: canUpdateDb } = useGetPermissions({
    resource: 'database-clusters',
    specificResource: dbCluster.metadata.name,
    namespace: dbCluster.metadata.namespace,
  });

  const { canCreate: canCreateDb } = useGetPermissions({
    resource: 'database-clusters',
  });

  return [
    ...(canUpdateDb
      ? [
          <MenuItem
            key={0}
            disabled={row.original.state !== BackupStatus.OK || restoring}
            onClick={() => {
              handleRestoreBackup(row.original.name);
            }}
            sx={{
              m: 0,
              gap: 1,
              px: 2,
              py: '10px',
            }}
          >
            <KeyboardReturnIcon />
            {Messages.restore}
          </MenuItem>,
        ]
      : []),
    ...(canCreateDb
      ? [
          <MenuItem
            key={1}
            disabled={row.original.state !== BackupStatus.OK || restoring}
            onClick={() => {
              handleRestoreToNewDbBackup(row.original.name);
            }}
            sx={{
              m: 0,
              gap: 1,
              px: 2,
              py: '10px',
            }}
          >
            <AddIcon />
            {Messages.restoreToNewDb}
          </MenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
          <MenuItem
            key={2}
            onClick={() => {
              handleDeleteBackup(row.original.name);
            }}
            sx={{
              m: 0,
              gap: 1,
              px: 2,
              py: '10px',
            }}
          >
            <DeleteIcon />
            {Messages.delete}
          </MenuItem>,
        ]
      : []),
  ];
};
