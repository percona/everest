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

import { useParams } from 'react-router-dom';
import { useDbClusterComponents } from 'hooks/api/db-cluster/useDbClusterComponents';
import { useMemo } from 'react';
import { capitalize, Tooltip } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { MRT_ColumnDef } from 'material-react-table';
import { DBClusterComponent } from 'shared-types/components.types';
import StatusField from 'components/status-field';
import { format, formatDistanceToNowStrict, isValid } from 'date-fns';
import {
  COMPONENT_STATUS,
  COMPONENT_STATUS_WEIGHT,
  componentStatusToBaseStatus,
} from './components.constants';
import ExpandedRow from './expanded-row';
import { DATE_FORMAT } from 'consts';

const Components = () => {
  const { dbClusterName, namespace = '' } = useParams();

  const { data: components = [], isFetching } = useDbClusterComponents(
    namespace,
    dbClusterName!
  );

  const columns = useMemo<MRT_ColumnDef<DBClusterComponent>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'status',
        Cell: ({ cell, row }) => (
          <StatusField
            status={cell.getValue<COMPONENT_STATUS>()}
            statusMap={componentStatusToBaseStatus(row?.original?.ready)}
          >
            {capitalize(cell?.row?.original?.status)}
          </StatusField>
        ),
        sortingFn: (rowA, rowB) => {
          return (
            COMPONENT_STATUS_WEIGHT[rowA?.original?.status] -
            COMPONENT_STATUS_WEIGHT[rowB?.original?.status]
          );
        },
      },
      {
        header: 'Ready',
        accessorKey: 'ready',
      },
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Type',
        accessorKey: 'type',
      },
      {
        header: 'Age',
        accessorKey: 'started',
        Cell: ({ cell }) => {
          const date = new Date(cell.getValue<string>());

          return isValid(date) ? (
            <Tooltip
              title={`Started at ${format(date, DATE_FORMAT)}`}
              placement="right"
              arrow
            >
              <div>{formatDistanceToNowStrict(date)}</div>
            </Tooltip>
          ) : (
            ''
          );
        },
      },
      {
        header: 'Restarts',
        accessorKey: 'restarts',
      },
    ];
  }, []);

  return (
    <Table
      initialState={{
        sorting: [
          {
            id: 'status',
            desc: true,
          },
        ],
      }}
      state={{ isLoading: isFetching && components?.length === 0 }}
      tableName={`${dbClusterName}-components`}
      columns={columns}
      data={components}
      noDataMessage={'No components'}
      renderDetailPanel={({ row }) => <ExpandedRow row={row} />}
      muiTableDetailPanelProps={{
        sx: {
          padding: 0,
          width: '100%',
          '.MuiCollapse-root': {
            width: '100%',
          },
        },
      }}
    />
  );
};

export default Components;
