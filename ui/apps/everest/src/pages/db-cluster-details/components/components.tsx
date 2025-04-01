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

import { capitalize, Tooltip } from '@mui/material';
import { Table } from '@percona/ui-lib';
import StatusField from 'components/status-field';
import { DATE_FORMAT } from 'consts';
import { format, formatDistanceToNowStrict, isValid } from 'date-fns';
import { useDbClusterComponents } from 'hooks/api/db-cluster/useDbClusterComponents';
import { MRT_ColumnDef } from 'material-react-table';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DBClusterComponent } from 'shared-types/components.types';
import {
  COMPONENT_STATUS,
  COMPONENT_STATUS_WEIGHT,
  componentStatusToBaseStatus,
} from './components.constants';
import ExpandedRow from './expanded-row';
import { AffinityListView } from 'components/cluster-form/affinity/affinity-list-view/affinity-list.view';
import { AffinityComponent, AffinityRule } from 'shared-types/affinity.types';
import { DbClusterContext } from '../dbCluster.context';
import {
  changeDbClusterAffinityRules,
  dbPayloadToAffinityRules,
} from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { useUpdateDbClusterWithConflictRetry } from 'hooks';

const Components = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const [updatingAffinityRules, setUpdatingAffinityRules] = useState(false);

  const { data: components = [], isLoading } = useDbClusterComponents(
    namespace,
    dbClusterName!
  );
  const { dbCluster } = useContext(DbClusterContext);
  const { mutate: update } = useUpdateDbClusterWithConflictRetry(dbCluster!, {
    onSuccess: () => {
      setUpdatingAffinityRules(false);
    },
    onError: () => setUpdatingAffinityRules(false),
  });
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
  const affinityRules = useMemo(
    () => dbPayloadToAffinityRules(dbCluster!),
    [dbCluster]
  );

  const onRulesChange = useCallback(
    (newRules: AffinityRule[]) => {
      const filteredRules: Record<AffinityComponent, AffinityRule[]> = {
        [AffinityComponent.DbNode]: [],
        [AffinityComponent.Proxy]: [],
        [AffinityComponent.ConfigServer]: [],
      };
      setUpdatingAffinityRules(true);

      newRules.forEach((rule) => {
        filteredRules[rule.component].push(rule);
      });
      update({
        dbCluster: changeDbClusterAffinityRules(dbCluster!, newRules),
        clusterName: dbCluster!.metadata.name,
        namespace: dbCluster!.metadata.namespace,
      });
    },
    [dbCluster, update]
  );

  return (
    <>
      <Table
        getRowId={(row) => row.name}
        initialState={{
          sorting: [
            {
              id: 'status',
              desc: true,
            },
          ],
        }}
        state={{ isLoading }}
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
      <AffinityListView
        rules={affinityRules}
        onRulesChange={onRulesChange}
        dbType={dbEngineToDbType(dbCluster!.spec.engine.type)}
        isShardingEnabled={!!dbCluster!.spec.sharding?.enabled}
        disableActions={updatingAffinityRules}
        boxProps={{ sx: { mt: 3 } }}
      />
    </>
  );
};

export default Components;
