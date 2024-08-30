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

import { MRT_Row } from 'material-react-table';
import { MenuItem } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { Messages } from './storage-locations.messages';
import { BackupStorageTableElement } from './storage-locations.types';
import { useGetPermissions } from 'utils/useGetPermissions';

export const StorageLocationsActionButtons = (
  row: MRT_Row<BackupStorageTableElement>,
  handleOpenEditModal: (storageLocation: BackupStorageTableElement) => void,
  handleDeleteBackup: (backupStorageName: string, namespace: string) => void
) => {
  const { canUpdate, canDelete } = useGetPermissions({
    resource: 'backup-storages',
    specificResource: row.original.name,
    namespace: row.original.namespace,
  });

  return [
    ...(canUpdate
      ? [
          <MenuItem
            key={0}
            onClick={() => {
              handleOpenEditModal(row.original);
            }}
            sx={{
              m: 0,
              gap: 1,
              px: 2,
              py: '10px',
            }}
          >
            <Edit /> {Messages.edit}
          </MenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
          <MenuItem
            key={1}
            onClick={() => {
              handleDeleteBackup(row.original.name, row.original.namespace);
            }}
            sx={{
              m: 0,
              gap: 1,
              px: 2,
              py: '10px',
            }}
          >
            <Delete />
            {Messages.delete}
          </MenuItem>,
        ]
      : []),
    // TODO: uncomment when api is ready
    // <MenuItem
    //   key={2}
    //   onClick={() => {}}
    //   sx={{ m: 0, display: 'flex', gap: 1 }}
    // >
    //   <AutoAwesome /> Set as default
    // </MenuItem>,
  ];
};
