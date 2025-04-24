import { Box, Button, Skeleton, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate, useParams } from 'react-router-dom';
import { usePodSchedulingPolicy, useUpdatePodSchedulingPolicy } from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';
import { useRef, useState } from 'react';
import { AffinityFormDialog } from '../affinity/affinity-form-dialog/affinity-form-dialog';
import {
  dbPayloadToAffinityRules,
  humanizeDbType,
  insertAffinityRuleToExistingPolicy,
  removeRuleInExistingPolicy,
} from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { AffinityRule } from 'shared-types/affinity.types';
import { useQueryClient } from '@tanstack/react-query';
import PodSchedulingPoliciesTable from 'components/pod-scheduling-policies-table';
import { useRBACPermissionRoute, useRBACPermissions } from 'hooks/rbac';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();
  const [openAffinityDialog, setOpenAffinityDialog] = useState(false);
  const selectedRule = useRef<AffinityRule>();
  const { mutate: updatePolicy, isPending: updatingPolicy } =
    useUpdatePodSchedulingPolicy();
  const queryClient = useQueryClient();
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

  const {
    isLoading,
    isError,
    data: policy,
  } = usePodSchedulingPolicy(policyName);

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

  if (isError || !policy) {
    return <NoMatch />;
  }

  const rules = dbPayloadToAffinityRules(policy);

  const handleFormSubmit = (rule: AffinityRule) => {
    if (selectedRule.current) {
      // We don't really edit the rule in the object, we just remove the old rule and add the new one
      removeRuleInExistingPolicy(policy, selectedRule.current);
    }
    insertAffinityRuleToExistingPolicy(policy, rule);
    updatePolicy(policy, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['pod-scheduling-policy', policyName],
        });
        setOpenAffinityDialog(false);
        selectedRule.current = undefined;
      },
    });
  };
  const handleOnAddClick = () => {
    selectedRule.current = undefined;
    setOpenAffinityDialog(true);
  };

  return (
    <>
      <Button
        sx={{ mt: 2 }}
        startIcon={<ArrowBack />}
        onClick={() =>
          navigate(`/settings/${SettingsTabs.podSchedulingPolicies}`)
        }
      >
        Back
      </Button>
      <Box display="flex" alignItems="center" gap={1} mt={3} mb={2}>
        <Typography variant="h6">
          {policyName}
          {policy
            ? ` / ${humanizeDbType(dbEngineToDbType(policy?.spec.engineType))}`
            : ''}
        </Typography>
      </Box>
      <PodSchedulingPoliciesTable
        rules={rules}
        showAddRuleButton={canUpdate}
        engineType={policy.spec.engineType}
        onRowClick={(rule) => {
          selectedRule.current = rule;
          setOpenAffinityDialog(true);
        }}
        onAddRuleClick={handleOnAddClick}
      />
      {openAffinityDialog && (
        <AffinityFormDialog
          isOpen
          submitting={updatingPolicy}
          dbType={dbEngineToDbType(policy.spec.engineType)}
          handleClose={() => setOpenAffinityDialog(false)}
          handleSubmit={handleFormSubmit}
          defaultValues={selectedRule.current}
        />
      )}
    </>
  );
};

export default PolicyDetails;
