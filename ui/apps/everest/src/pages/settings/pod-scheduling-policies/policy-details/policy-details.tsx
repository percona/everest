import { Alert, Box, Button, Skeleton, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useUpdateEntityWithConflictRetry,
  useClusters,
} from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';
import { useRef, useState, useMemo } from 'react';
import { AffinityFormDialog } from '../affinity/affinity-form-dialog/affinity-form-dialog';
import {
  dbPayloadToAffinityRules,
  humanizeDbType,
  insertAffinityRuleToExistingPolicy,
  removeRuleInExistingPolicy,
} from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { AffinityRule } from 'shared-types/affinity.types';
import PodSchedulingPoliciesTable from 'components/pod-scheduling-policies-table';
import { useRBACPermissionRoute, useRBACPermissions } from 'hooks/rbac';
import {
  EVEREST_POLICY_IN_USE_FINALIZER,
  EVEREST_READ_ONLY_FINALIZER,
} from 'consts';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { Messages } from '../pod-scheduling-policies.messages';
import { updatePodSchedulingPolicy, getPodSchedulingPolicy } from 'api/podSchedulingPolicies';
import { QueryObserverResult, useQueries } from '@tanstack/react-query';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();
  const [openAffinityDialog, setOpenAffinityDialog] = useState(false);
  const [openRemoveRuleDialog, setOpenRemoveRuleDialog] = useState(false);
  const selectedRule = useRef<AffinityRule>();
  const { canUpdate } = useRBACPermissions(
    'pod-scheduling-policies',
    policyName
  );

  useRBACPermissionRoute([
    {
      action: 'read',
      resource: 'pod-scheduling-policies',
      specificResources: [policyName],
    },
  ]);

  const { data: clusters = [], isLoading: isLoadingClusters } = useClusters();

  const policiesQueries = useQueries({
    queries: clusters.map((cluster) => ({
      queryKey: ['pod-scheduling-policy', cluster.name, policyName],
      queryFn: () => getPodSchedulingPolicy(cluster.name, policyName),
      enabled: !!cluster.name && !!policyName,
    })),
  });

  const policyData = useMemo(() => {
    const foundIndex = policiesQueries.findIndex((query) => query.data);
    if (foundIndex === -1) return undefined;

    const query = policiesQueries[foundIndex];
    return {
      cluster: clusters[foundIndex].name,
      policy: query.data,
      refetch: query.refetch,
    };
  }, [clusters, policiesQueries]);

  const isLoading = isLoadingClusters || policiesQueries.some((query) => query.isLoading);
  const isError = policiesQueries.every((query) => query.isError);

  // Default empty refetch function if none is provided
  const defaultRefetch = async () => {
    return {
      data: {} as PodSchedulingPolicy,
    } as QueryObserverResult<PodSchedulingPolicy, unknown>;
  };

  const { mutate: updatePolicy, isPending: updatingPolicy } =
    useUpdateEntityWithConflictRetry(
      ['pod-scheduling-policy', policyName],
      (newPolicy) => updatePodSchedulingPolicy(policyData?.cluster || clusters[0]?.name || '', newPolicy),
      policyData?.policy?.metadata.generation || 0,
      policyData?.refetch || defaultRefetch,
      (_, newData) => newData,
      {
        onSuccess: () => {
          setOpenRemoveRuleDialog(false);
          setOpenAffinityDialog(false);
          selectedRule.current = undefined;
        },
      }
    );

  if (isLoading) {
    return (
      <>
        <Skeleton variant="rectangular" />
        <Skeleton variant="rectangular" />
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton variant="rectangular" />
      </>
    );
  }

  if (isError || !policyData?.policy || !clusters.length) {
    return <NoMatch />;
  }

  const policy = policyData.policy;
  const rules = dbPayloadToAffinityRules(policy);
  const readOnlyPolicy = policy.metadata.finalizers?.includes(
    EVEREST_READ_ONLY_FINALIZER
  );

  const handleFormSubmit = (rule: AffinityRule) => {
    if (selectedRule.current) {
      // We don't really edit the rule in the object, we just remove the old rule and add the new one
      removeRuleInExistingPolicy(policy, selectedRule.current);
    }
    insertAffinityRuleToExistingPolicy(policy, rule);
    updatePolicy(policy);
  };

  return (
    <>
      <Box display="flex" alignItems="center" mb={2}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/settings/pod-scheduling-policies')}
          sx={{ mr: 2 }}
        >
          Back to policies
        </Button>
        <Typography variant="h5" component="h1">
          {policy.metadata.name}
        </Typography>
      </Box>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="body2" mr={2}>
          Technology: {humanizeDbType(dbEngineToDbType(policy.spec.engineType))}
        </Typography>
        <Typography variant="body2">
          Cluster: {policyData.cluster}
        </Typography>
      </Box>
      <PodSchedulingPoliciesTable
        rules={rules}
        engineType={policy.spec.engineType}
        viewOnly={readOnlyPolicy}
        canDoChanges={canUpdate}
        onEditClick={(rule) => {
          selectedRule.current = rule;
          setOpenAffinityDialog(true);
        }}
        onDeleteClick={(rule) => {
          selectedRule.current = rule;
          setOpenRemoveRuleDialog(true);
        }}
        onAddRuleClick={() => {
          selectedRule.current = undefined;
          setOpenAffinityDialog(true);
        }}
      />
      {openAffinityDialog && (
        <AffinityFormDialog
          isOpen={openAffinityDialog}
          dbType={dbEngineToDbType(policy.spec.engineType)}
          defaultValues={selectedRule.current}
          submitting={updatingPolicy}
          showInUseWarning={policy.metadata.finalizers.includes(
            EVEREST_POLICY_IN_USE_FINALIZER
          )}
          handleClose={() => {
            setOpenAffinityDialog(false);
            selectedRule.current = undefined;
          }}
          handleSubmit={handleFormSubmit}
        />
      )}
      {openRemoveRuleDialog && (
        <ConfirmDialog
          open={openRemoveRuleDialog}
          selectedId="remove-rule"
          headerMessage="Delete Rule"
          closeModal={() => {
            setOpenRemoveRuleDialog(false);
            selectedRule.current = undefined;
          }}
          handleConfirm={() => {
            if (selectedRule.current && policy) {
              removeRuleInExistingPolicy(policy, selectedRule.current);
              updatePolicy(policy);
            }
          }}
          submitMessage="Delete"
          cancelMessage="Cancel"
        >
          <Alert severity="warning">{Messages.policyInUse}</Alert>
          <Typography px={1} pt={2}>
            Are you sure you want to delete this rule?
          </Typography>
        </ConfirmDialog>
      )}
    </>
  );
};

export default PolicyDetails;
