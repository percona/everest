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
import { useCreatePodSchedulingPolicy } from 'hooks';

const PoliciesList = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const selectedPolicy = useRef<string>('');
  const navigate = useNavigate();
  const { mutate: createPolicy } = useCreatePodSchedulingPolicy();

  const columns = useMemo<MRT_ColumnDef[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'technology',
        header: 'Technology',
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
        data={[
          {
            name: 'default-mysql',
            technology: 'MySQL',
          },
          {
            name: 'default-postgresql',
            technology: 'PostgreSQL',
          },
          {
            name: 'default-mongodb',
            technology: 'MongoDB',
          },
        ]}
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
                      // @ts-ignore
                      `/settings/pod-scheduling-policies/${row.original.name}`
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
