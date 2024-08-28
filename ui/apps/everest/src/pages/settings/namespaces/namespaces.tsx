import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';
import { Typography } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { useQueries } from '@tanstack/react-query';
import { NamespaceInstance } from 'shared-types/namespaces.types';
import { useDBEnginesForNamespaces } from 'hooks/api/namespaces/useNamespaces';
import { operatorUpgradePlanQueryFn } from 'hooks/api/db-engines';
import { Messages } from './namespaces.messages';
import { OperatorCell } from './operatorCell';

export const Namespaces = () => {
  const dbEngines = useDBEnginesForNamespaces();
  const operatorsUpgradePlan = useQueries({
    queries: dbEngines.map((item) => ({
      queryKey: ['operatorUpgradePlan', item.namespace],
      queryFn: () =>
        operatorUpgradePlanQueryFn(item.namespace, item.data || []),
      enabled: dbEngines.every((result) => result.isSuccess),
    })),
  });

  const namespacesData: NamespaceInstance[] = dbEngines.map((item, idx) => ({
    name: item.namespace,
    upgradeAvailable: operatorsUpgradePlan[idx].isSuccess
      ? operatorsUpgradePlan[idx].data.upgrades.length > 0
      : false,
    operator: item.isSuccess
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
        accessorKey: 'operator',
        header: 'Operator',
        Cell: ({ cell, row }) => (
          <OperatorCell
            value={cell.getValue<string>()}
            namespace={row.original.name}
            upgradeAvailable={row.original.upgradeAvailable}
          />
        ),
      },
    ],
    []
  );

  return (
    <>
      <Table
        tableName="namespaces"
        noDataMessage={Messages.noDataMessage}
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
