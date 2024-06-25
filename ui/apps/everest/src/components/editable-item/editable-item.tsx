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

import { Box, IconButton, Paper } from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { EditableItemProps } from './editable-item.types';

const EditableItem = ({
  children,
  dataTestId,
  paperProps,
  deleteButtonProps,
  editButtonProps,
}: EditableItemProps) => {
  return (
    <Paper
      data-testid="editable-item"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        paddingX: 2,
        paddingY: 1,
        marginTop: 1,
        justifyContent: 'space-between',
      }}
      variant="outlined"
      {...paperProps}
    >
      {children}
      <Box flexWrap="nowrap" display="flex">
        {editButtonProps && (
          <IconButton
            size="small"
            data-testid={`delete-editable-item-button-${dataTestId}`}
            color="primary"
            {...editButtonProps}
          >
            <EditOutlinedIcon />
          </IconButton>
        )}
        {deleteButtonProps && (
          <IconButton
            size="small"
            data-testid={`delete-editable-item-button-${dataTestId}`}
            color="primary"
            {...deleteButtonProps}
          >
            <DeleteOutlineOutlinedIcon />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default EditableItem;
