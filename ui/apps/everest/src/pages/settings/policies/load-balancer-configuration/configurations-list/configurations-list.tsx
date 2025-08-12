import { Add } from '@mui/icons-material';
import { Button, Typography } from '@mui/material';
import { Table } from '@percona/ui-lib';
import EmptyState from 'components/empty-state';
import {
  useCreateLoadBalancerConfig,
  useLoadBalancerConfigs,
} from 'hooks/api/load-balancer';
import { useRBACPermissions } from 'hooks/rbac';
import { useNavigate } from 'react-router-dom';
// import PolicyRowActions from '../../pod-scheduling-policies/policies-list/policy-row-actions';
// import { EVEREST_READ_ONLY_FINALIZER } from 'consts';
import { useState } from 'react';
import LoadBalancerDialog from '../load-balancer-dialog';

const LoadBalancerConfigurationList = () => {
  const { data: loadBalancerConfigurations } = useLoadBalancerConfigs(
    'load-balancer-configs'
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { canCreate } = useRBACPermissions('load-balancer-configuration');
  const { mutate: createConfiguration } = useCreateLoadBalancerConfig();

  const columns = [
    {
      accessorKey: 'metadata.name',
      header: 'Name',
    },
  ];

  const handleOnCreateConfiguration = (data: { name: string }) => {
    setDialogOpen(false);
    createConfiguration({
      metadata: {
        name: data.name,
      },
    });
  };

  return (
    <>
      <Table
        tableName="load-balancer-configuration"
        emptyState={
          <EmptyState
            onButtonClick={() => setDialogOpen(true)}
            buttonText="Create configuration"
            showCreationButton={canCreate}
            contentSlot={
              <Typography variant="body1">
                You currently do not have any policy
              </Typography>
            }
          />
        }
        data={loadBalancerConfigurations?.items || []}
        columns={columns}
        enableRowActions
        enableRowHoverAction
        rowHoverAction={(row) =>
          navigate(
            `/settings/policies/pod-scheduling/${row.original.metadata?.name}`
          )
        }
        renderTopToolbarCustomActions={() =>
          canCreate ? (
            <Button
              size="small"
              startIcon={<Add />}
              data-testid="add-policy"
              variant="outlined"
              onClick={() => setDialogOpen(true)}
              sx={{ display: 'flex' }}
            >
              Create configuration
            </Button>
          ) : null
        }
        // renderRowActions={({ row }) => (
        //   <PolicyRowActions
        //     policyName={row.original.metadata?.name ?? ''}
        //     // readOnly={row.original.metadata.finalizers.includes(
        //     //   EVEREST_READ_ONLY_FINALIZER
        //     // )}
        //     // handleOnDeleteIconClick={() => handleOnDeleteIconClick(row.original)}
        //   />
        // )}
      />
      {dialogOpen && (
        <LoadBalancerDialog
          open
          existingConfigs={loadBalancerConfigurations?.items || []}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleOnCreateConfiguration}
        />
      )}
      {/* {deleteDialogOpen && (
        <DeletePolicyDialog
          open
          policyName={selectedPolicy?.metadata.name ?? ''}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )} */}
    </>
  );
};

export default LoadBalancerConfigurationList;
