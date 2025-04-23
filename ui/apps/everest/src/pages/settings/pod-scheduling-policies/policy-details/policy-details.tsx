import {
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/EditOutlined';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate, useParams } from 'react-router-dom';
import { usePodSchedulingPolicy, useUpdatePodSchedulingPolicy } from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';
import { Table } from '@percona/ui-lib';
import EmptyState from 'components/empty-state';
import { useMemo, useRef, useState } from 'react';
import { AffinityFormDialog } from '../affinity/affinity-form-dialog/affinity-form-dialog';
import {
  dbPayloadToAffinityRules,
  getAffinityComponentLabel,
  getAffinityRuleTypeLabel,
  humanizeDbType,
  insertAffinityRuleToExistingPolicy,
  removeRuleInExistingPolicy,
} from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import {
  AffinityComponent,
  AffinityPriority,
  AffinityRule,
  AffinityType,
} from 'shared-types/affinity.types';
import { useQueryClient } from '@tanstack/react-query';
import { MRT_ColumnDef } from 'material-react-table';
import { DbEngineType } from '@percona/types';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();
  const [openAffinityDialog, setOpenAffinityDialog] = useState(false);
  const selectedRule = useRef<AffinityRule>();
  const { mutate: updatePolicy, isPending: updatingPolicy } =
    useUpdatePodSchedulingPolicy();
  const queryClient = useQueryClient();

  const {
    isLoading,
    isError,
    data: policy,
  } = usePodSchedulingPolicy(policyName);

  const columns = useMemo<MRT_ColumnDef<AffinityRule>[]>(
    () => [
      {
        accessorKey: 'component',
        header: 'Component',
        Cell: ({ cell }) =>
          getAffinityComponentLabel(
            dbEngineToDbType(
              policy?.spec.engineType || DbEngineType.POSTGRESQL
            ),
            cell.getValue<AffinityComponent>()
          ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        Cell: ({ cell }) =>
          getAffinityRuleTypeLabel(cell.getValue<AffinityType>()),
      },
      {
        accessorKey: 'priority',
        header: 'Preference',
        Cell: ({ cell, row }) => {
          const value = cell.getValue<AffinityPriority>();
          return (
            <Typography variant="body2">
              {`${value === AffinityPriority.Preferred ? `Preferred: ${row.original.weight}` : 'Required'}`}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'topologyKey',
        header: 'Topology Key',
        Cell: ({ cell }) => (
          <Typography variant="body2">{cell.getValue<string>()}</Typography>
        ),
      },
      {
        accessorKey: 'key',
        header: 'Match expression',
        Cell: ({ row }) => {
          const valuesToShow =
            row.original.type === AffinityType.NodeAffinity
              ? []
              : [row.original.topologyKey];

          return (
            <Typography variant="body2">
              {[
                ...valuesToShow,
                row.original.key,
                row.original.operator,
                row.original.values,
              ]
                .filter((v) => !!v)
                .join(' | ')}
            </Typography>
          );
        },
      },
    ],
    [policy?.spec.engineType]
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
      <Table
        tableName="policy-rules"
        data={rules}
        columns={columns}
        enableRowActions
        emptyState={
          <EmptyState
            onButtonClick={handleOnAddClick}
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
        renderTopToolbarCustomActions={() => (
          <Button
            size="small"
            variant="contained"
            onClick={handleOnAddClick}
            data-testid="add-affinity-rule-button"
            sx={{ display: 'flex' }}
            startIcon={<Add />}
          >
            Add rule
          </Button>
        )}
        renderRowActions={({ row }) => (
          <IconButton
            size="small"
            aria-label="edit"
            onClick={() => {
              selectedRule.current = row.original;
              setOpenAffinityDialog(true);
            }}
            data-testid="edit-affinity-rule-button"
          >
            <Edit />
          </IconButton>
        )}
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
