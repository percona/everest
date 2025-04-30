import Add from '@mui/icons-material/Add';
import { Button, Typography } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliciesDialog from '../policies-dialog';
import { MRT_ColumnDef } from 'material-react-table';

import DeletePolicyDialog from './delete-policy-dialog';
import { DbEngineType } from '@percona/types';
import {
  useCreatePodSchedulingPolicy,
  useDeletePodSchedulingPolicy,
  usePodSchedulingPolicies,
} from 'hooks';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { humanizeDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { useQueryClient } from '@tanstack/react-query';
import EmptyState from 'components/empty-state';
import { usePermissionsForResource } from 'hooks/rbac';
import PolicyRowActions from './policy-row-actions';

const PoliciesList = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const selectedPolicy = useRef<PodSchedulingPolicy>();
  const { canCreate: canCreatePolicies } = usePermissionsForResource(
    'pod-scheduling-policies'
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: createPolicy } = useCreatePodSchedulingPolicy();
  const { mutate: deletePolicy } = useDeletePodSchedulingPolicy();
  const { data: podSchedulingPolicies = [] } = usePodSchedulingPolicies(
    undefined,
    {
      refetchInterval: 10000,
    }
  );

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

  const handleOnDeleteIconClick = (policy: PodSchedulingPolicy) => {
    selectedPolicy.current = policy;
    setDeleteDialogOpen(true);
  };

  const handleOnDeletePolicy = () => {
    if (selectedPolicy.current) {
      deletePolicy(selectedPolicy.current.metadata.name, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['pod-scheduling-policies'],
          });
          setDeleteDialogOpen(false);
          selectedPolicy.current = undefined;
        },
      });
    }
  };

  return (
    <>
      <Table
        tableName="pod-scheduling-policies"
        emptyState={
          <EmptyState
            onButtonClick={() => setDialogOpen(true)}
            buttonText="Create policy"
            showCreationButton={canCreatePolicies}
            contentSlot={
              <Typography variant="body1">
                You currently do not have any policy
              </Typography>
            }
          />
        }
        data={podSchedulingPolicies}
        columns={columns}
        enableRowActions
        enableRowHoverAction
        rowHoverAction={(row) =>
          navigate(
            `/settings/pod-scheduling-policies/${row.original.metadata.name}`
          )
        }
        renderTopToolbarCustomActions={() =>
          canCreatePolicies ? (
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
          ) : null
        }
        renderRowActions={({ row }) => (
          <PolicyRowActions
            policyName={row.original.metadata.name}
            handleOnDeleteIconClick={() =>
              handleOnDeleteIconClick(row.original)
            }
          />
        )}
      />
      {dialogOpen && (
        <PoliciesDialog
          open
          onClose={() => setDialogOpen(false)}
          onSubmit={handleOnCreatePolicy}
        />
      )}
      {deleteDialogOpen && (
        <DeletePolicyDialog
          isOpen
          policyName={selectedPolicy.current?.metadata.name || ''}
          handleCloseDeleteDialog={() => setDeleteDialogOpen(false)}
          handleConfirmDelete={handleOnDeletePolicy}
        />
      )}
    </>
  );
};

export default PoliciesList;
