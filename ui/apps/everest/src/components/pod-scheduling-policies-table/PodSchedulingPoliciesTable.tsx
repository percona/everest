import { useMemo } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Table } from '@percona/ui-lib';
import {
  AffinityComponent,
  AffinityPriority,
  AffinityRule,
  AffinityType,
} from 'shared-types/affinity.types';
import { getAffinityComponentLabel, getAffinityRuleTypeLabel } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { DbEngineType } from '@percona/types';
import { Button, IconButton, Stack, Typography } from '@mui/material';
import EmptyState from 'components/empty-state';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/EditOutlined';
import Delete from '@mui/icons-material/DeleteOutlineOutlined';

type Props = {
  rules: AffinityRule[];
  engineType: DbEngineType;
  viewOnly?: boolean;
  canDoChanges?: boolean;
  onEditClick?: (rule: AffinityRule) => void;
  onDeleteClick?: (rule: AffinityRule) => void;
  onAddRuleClick?: () => void;
};

const PodSchedulingPoliciesTable = ({
  rules,
  engineType,
  viewOnly = false,
  canDoChanges = false,
  onEditClick = () => {},
  onDeleteClick = () => {},
  onAddRuleClick = () => {},
}: Props) => {
  const columns = useMemo<MRT_ColumnDef<AffinityRule>[]>(
    () => [
      {
        accessorKey: 'component',
        header: 'Component',
        Cell: ({ cell }) =>
          getAffinityComponentLabel(
            dbEngineToDbType(engineType),
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
    [engineType]
  );
  return (
    <Table
      tableName="policy-rules"
      data={rules}
      columns={columns}
      enableTopToolbar
      emptyState={
        <EmptyState
          onButtonClick={onAddRuleClick}
          buttonProps={{
            startIcon: <Add />,
          }}
          showCreationButton={canDoChanges}
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
      renderTopToolbarCustomActions={
        viewOnly || !canDoChanges
          ? undefined
          : () =>
              rules.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onAddRuleClick}
                  data-testid="add-rule-button"
                  sx={{ display: 'flex' }}
                  startIcon={<Add />}
                >
                  Add rule
                </Button>
              )
      }
      enableRowActions
      renderRowActions={
        viewOnly || !canDoChanges
          ? undefined
          : ({ row }) => (
              <Stack direction="row">
                <IconButton
                  size="small"
                  aria-label="edit"
                  onClick={() => onEditClick(row.original)}
                  data-testid="edit-rule-button"
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="delete"
                  onClick={() => onDeleteClick(row.original)}
                  data-testid="delete-rule-button"
                >
                  <Delete />
                </IconButton>
              </Stack>
            )
      }
    />
  );
};

export default PodSchedulingPoliciesTable;
