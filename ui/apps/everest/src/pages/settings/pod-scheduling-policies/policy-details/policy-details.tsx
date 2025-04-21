import {
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate, useParams } from 'react-router-dom';
import { usePodSchedulingPolicy, useUpdatePodSchedulingPolicy } from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';
import { Table } from '@percona/ui-lib';
import EmptyState from 'components/empty-state';
import { useState } from 'react';
import { AffinityFormDialog } from '../affinity/affinity-form-dialog/affinity-form-dialog';
import { humanizeDbType, insertAffinityRuleToExistingPolicy } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { AffinityRule } from 'shared-types/affinity.types';
import { useQueryClient } from '@tanstack/react-query';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();
  const [openAffinityDialog, setOpenAffinityDialog] = useState(false);
  const { mutate: updatePolicy } = useUpdatePodSchedulingPolicy();
  const queryClient = useQueryClient();

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

  const handleFormSubmit = (rule: AffinityRule) => {
    insertAffinityRuleToExistingPolicy(policy, rule);
    updatePolicy(policy, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['pod-scheduling-policy', policyName],
        });
        setOpenAffinityDialog(false);
      },
    });
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
        <IconButton
          size="medium"
          aria-label="edit"
          onClick={() => {}}
          data-testid="edit-policy-button"
          sx={{
            position: 'relative',
            bottom: '2px',
          }}
        >
          <Edit />
        </IconButton>
      </Box>
      <Table
        tableName="policy-rules"
        data={[]}
        columns={[]}
        emptyState={
          <EmptyState
            onButtonClick={() => setOpenAffinityDialog(true)}
            buttonText="Add rule"
            contentSlot={
              <Stack alignItems="center">
                <Typography variant="body1">
                  You currently do not have any rules in this policy.
                </Typography>
                <Typography variant="body1">
                  Create one to get started.
                </Typography>
              </Stack>
            }
          />
        }
      />
      <AffinityFormDialog
        isOpen={openAffinityDialog}
        dbType={dbEngineToDbType(policy.spec.engineType)}
        handleClose={() => setOpenAffinityDialog(false)}
        handleSubmit={handleFormSubmit}
      />
    </>
  );
};

export default PolicyDetails;
