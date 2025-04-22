import Add from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import { Button, MenuItem } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliciesDialog from './policies-dialog';
import { MRT_ColumnDef } from 'material-react-table';
import TableActionsMenu from 'components/table-actions-menu';
import DeletePolicyDialog from './delete-policy-dialog';
import { DbEngineType } from '@percona/types';
import { useCreatePodSchedulingPolicy, usePodSchedulingPolicies } from 'hooks';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { humanizeDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';

const PoliciesList = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const selectedPolicy = useRef<string>('');
  const navigate = useNavigate();
  const { mutate: createPolicy } = useCreatePodSchedulingPolicy();
  const { data: podSchedulingPolicies = [] } = usePodSchedulingPolicies();

  const columns = useMemo<MRT_ColumnDef<PodSchedulingPolicy>[]>(
    () => [
      {
        accessorKey: 'metadata.name',
        header: 'Name',
      },
      {
        accessorKey: 'spec.engineType',
        header: 'Technology',
        Cell: ({ cell }) => {
          const engineType = cell.getValue<DbEngineType>();
          return humanizeDbType(dbEngineToDbType(engineType));
        },
      },
    ],
    []
  );

  const handleOnCreatePolicy = (data: { name: string; type: DbEngineType }) => {
    createPolicy(
      { policyName: data.name, dbType: data.type },
      {
        onSuccess: () => {
          setDialogOpen(false);
          navigate(data.name);
        },
      }
    );
  };

  // @ts-ignore
  // const handleOnDeleteIconClick = (row: any) => {
  //   selectedPolicy.current = row.original.name;
  //   setDeleteDialogOpen(true);
  // };

  return (
    <>
      <Table
        tableName="pod-scheduling-policies"
        noDataMessage="No pod scheduling policies added"
        data={podSchedulingPolicies}
        columns={columns}
        enableRowActions
        renderTopToolbarCustomActions={() => (
          // TODO check if user has permission to create
          <Button
            size="small"
            startIcon={<Add />}
            data-testid="add-policy"
            variant="outlined"
            onClick={() => setDialogOpen(true)}
            sx={{ display: 'flex' }}
          >
            Create policy
          </Button>
        )}
        renderRowActions={({ row }) => {
          return (
            <TableActionsMenu
              menuItems={[
                <MenuItem
                  key="view"
                  onClick={() =>
                    navigate(
                      `/settings/pod-scheduling-policies/${row.original.metadata.name}` // TODO check if user has permission to view
                    )
                  }
                >
                  <Visibility sx={{ mr: 1 }} />
                  View details
                </MenuItem>,
                <MenuItem
                  key="delete"
                  // onClick={() => handleOnDeleteIconClick(row)}
                >
                  <DeleteIcon sx={{ mr: 1 }} />
                  Delete
                </MenuItem>,
              ]}
            />
          );
        }}
      />
      <PoliciesDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleOnCreatePolicy}
      />
      <DeletePolicyDialog
        isOpen={deleteDialogOpen}
        policyName={selectedPolicy.current}
        handleCloseDeleteDialog={() => setDeleteDialogOpen(false)}
      />
    </>
  );
};

export default PoliciesList;
