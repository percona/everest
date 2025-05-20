import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';
import { Typography } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { useQueries } from '@tanstack/react-query';
import { NamespaceInstance } from 'shared-types/namespaces.types';
import { useDBEnginesForNamespaces } from 'hooks/api/namespaces/useNamespaces';
import { operatorUpgradePlanQueryFn } from 'hooks/api/db-engines';
import { Messages } from './namespaces.messages';
import { OperatorCell } from './OperatorCell';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import EmptyStateNamespaces from 'components/empty-state-namespaces';

export const Namespaces = () => {
  const { results: rawDbEngines } = useDBEnginesForNamespaces();
  const dbEngines = rawDbEngines?.filter(
    (item) => item.data && item.data.length
  );
  const { canRead } = useNamespacePermissionsForResource('database-clusters');
  const operatorsUpgradePlan = useQueries({
    queries: dbEngines.map((item) => ({
      queryKey: ['operatorUpgradePlan', item.namespace],
      queryFn: () =>
        operatorUpgradePlanQueryFn(item.namespace, item.data || []),
      enabled:
        dbEngines.every((result) => result.isSuccess) &&
        canRead.includes(item.namespace),
    })),
  });

  const namespacesData: NamespaceInstance[] = dbEngines.map((item, idx) => ({
    name: item.namespace,
    upgradeAvailable: operatorsUpgradePlan[idx].isSuccess
      ? operatorsUpgradePlan[idx].data.upgrades.length > 0
      : false,
    operators: item.data?.map((engine) => engine.name) || [],
    pendingActions: operatorsUpgradePlan[idx].isSuccess
      ? operatorsUpgradePlan[idx].data.pendingActions
      : [],
    operatorsDescription: item.isSuccess
      ? item.data?.reduce((prevVal, currVal, idx) => {
          if (idx === 0 || prevVal === '') {
            if (currVal?.type && currVal?.operatorVersion) {
              return `${currVal.type} (${currVal.operatorVersion})`;
            } else return '';
          } else {
            return (
              prevVal + '; ' + `${currVal.type} (${currVal.operatorVersion})`
            );
          }
        }, '')
      : '-',
  }));

  const isFetching =
    dbEngines.some((result) => result.isLoading) ||
    operatorsUpgradePlan.some((result) => result.isLoading);

  const columns = useMemo<MRT_ColumnDef<NamespaceInstance>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Namespace',
        Cell: ({ cell }) => <Typography>{cell.getValue<string>()}</Typography>,
      },
      {
        accessorKey: 'operatorsDescription',
        header: 'Operator',
        Cell: ({ cell, row }) => (
          <OperatorCell
            description={cell.getValue<string>()}
            namespaceInstance={row.original}
          />
        ),
      },
    ],
    []
  );

  return (
    <>
      <Table
        getRowId={(row) => row.name}
        tableName="namespaces"
        noDataMessage={Messages.noDataMessage}
        emptyState={<EmptyStateNamespaces />}
        hideExpandAllIcon
        state={{
          isLoading: isFetching,
        }}
        columns={columns}
        data={namespacesData}
        // enableRowActions
        // renderRowActionMenuItems={({ row, closeMenu }) => [
        //     <MenuItem
        //         key={1} //TODO EVEREST-677 actions will be in later iterations (now we haven't mockups)
        //         onClick={() => {
        //             // handleDe(row.original.name);
        //             closeMenu();
        //         }}
        //         sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
        //     >
        //         <Delete />
        //         {Messages.delete}
        //     </MenuItem>,
        // ]}
      />
    </>
  );
};
