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

import { Box, Typography, useTheme } from '@mui/material';
import { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import { DBClusterComponent } from 'shared-types/components.types';
import {
  CONTAINER_STATUS,
  containerStatusToBaseStatus,
} from '../components.constants';
import { useMemo } from 'react';
import { Container } from 'shared-types/components.types';
import { Table } from '@percona/ui-lib';
import ComponentStatus from '../component-status';
import ComponentAge from '../component-age';

const ExpandedRow = ({ row }: { row: MRT_Row<DBClusterComponent> }) => {
  const { containers, name } = row.original;
  const theme = useTheme();
  const columns = useMemo<MRT_ColumnDef<Container>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'status',
        Cell: ({ cell, row }) => (
          <ComponentStatus
            status={cell.getValue<CONTAINER_STATUS>()}
            statusMap={containerStatusToBaseStatus(row.original.ready)}
            iconProps={{
              size: 'small',
            }}
            stackProps={{
              paddingLeft: 1,
              gap: 2,
              alignItems: 'center',
            }}
            typographyProps={{
              variant: 'body2',
            }}
          />
        ),
      },
      {
        header: 'Ready',
        accessorKey: 'ready',
        Cell: ({ cell }) => (
          <Typography variant="caption" color={theme.palette.text.secondary}>
            {cell.getValue<boolean>().toString()}
          </Typography>
        ),
      },
      {
        header: 'Name',
        accessorKey: 'name',
        Cell: ({ cell }) => (
          <Typography variant="caption" color={theme.palette.text.secondary}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        header: 'Fake column',
        accessorKey: 'type',
      },
      {
        header: 'Age',
        accessorKey: 'started',
        Cell: ({ cell, row }) =>
          row?.original?.status === CONTAINER_STATUS.RUNNING ? (
            <ComponentAge date={cell.getValue<string>()} />
          ) : null,
      },
      {
        header: 'Restarts',
        accessorKey: 'restarts',
        Cell: ({ cell }) => {
          return (
            <Typography variant="caption" color={theme.palette.text.secondary}>
              {cell.getValue<string>()}
            </Typography>
          );
        },
      },
    ];
  }, [theme.palette.text.secondary]);

  return (
    <Box
      data-testid="containers-table"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        cursor: 'auto',
        py: 1,
        width: '100%',
        justifyContent: 'start',
        alignItems: 'start',
        '& .MuiPaper-root': {
          width: '100%',
          paddingRight: '60px',
        },
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Table
        getRowId={(row) => row.name}
        state={{ isLoading: false }}
        tableName={`${name}-containers`}
        columns={columns}
        data={containers}
        noDataMessage={'No containers'}
        enableTableHead={false}
        enableTopToolbar={false}
        muiTableBodyCellProps={{
          sx: {
            '&': {
              border: 'none',
              py: 0.5,
            },
          },
        }}
      />
    </Box>
  );
};

export default ExpandedRow;
