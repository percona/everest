import { Box, BoxProps, Stack, Typography } from '@mui/material';
import { DbType } from '@percona/types';
import { ActionableLabeledContent } from '@percona/ui-lib';
import {
  AffinityComponent,
  AffinityComponentValue,
  AffinityPriority,
  AffinityPriorityValue,
  AffinityRule,
} from 'shared-types/affinity.types';
import EditableItem from 'components/editable-item';
import { Fragment, useState } from 'react';
import { AffinityFormDialog } from '../affinity-form-dialog/affinity-form-dialog';
import { AffinityFormDialogContext } from '../affinity-form-dialog/affinity-form-dialog-context/affinity-form-context';
import { AffinityFormData } from '../affinity-form-dialog/affinity-form/affinity-form.types';
import { availableComponentsType } from '../affinity-utils';
import { AffinityItem } from './affinity-item';
import { convertFormDataToAffinityRule } from '../affinity-form-dialog/affinity-form/affinity-form.utils';

export const AffinityListView = ({
  onRulesChange,
  dbType,
  initialRules = [],
  isShardingEnabled = false,
  disableActions = false,
  boxProps = { sx: {} },
}: {
  initialRules?: AffinityRule[];
  onRulesChange: (newRules: AffinityRule[]) => void;
  dbType: DbType;
  isShardingEnabled?: boolean;
  disableActions?: boolean;
  boxProps?: BoxProps;
}) => {
  const [selectedAffinityUid, setSelectedAffinityUid] = useState<string | null>(
    null
  );
  const [openAffinityModal, setOpenAffinityModal] = useState(false);
  const [rules, setRules] = useState<AffinityRule[]>(initialRules);
  const { sx: boxSx, ...rest } = boxProps;

  const handleCreate = () => {
    setOpenAffinityModal(true);
  };

  const handleEdit = (uid: string) => {
    setSelectedAffinityUid(uid);
    setOpenAffinityModal(true);
  };

  const handleClose = () => {
    setOpenAffinityModal(false);
  };

  const handleDelete = (ruleUid: string) => {
    const newRules = rules.filter(({ uid }) => uid !== ruleUid);
    updateRules(newRules);
  };

  const onSubmit = (data: AffinityFormData) => {
    let newRules: AffinityRule[] = [];
    const addedRule = convertFormDataToAffinityRule(data);

    if (selectedAffinityUid === null) {
      newRules = [...rules, addedRule];
    } else {
      newRules = [...rules];
      const ruleIdx = newRules.findIndex(
        ({ uid }) => uid === selectedAffinityUid
      );

      if (ruleIdx !== -1) {
        newRules[ruleIdx] = addedRule;
      }
    }
    updateRules(newRules);
    setSelectedAffinityUid(null);
    setOpenAffinityModal(false);
  };

  const updateRules = (newRules: AffinityRule[]) => {
    setRules(newRules);
    onRulesChange(newRules);
  };

  return (
    <Box
      sx={{
        marginBottom: '15px',
        border: '1px solid #2C323E40',
        padding: '10px',
        ...boxSx,
      }}
      {...rest}
    >
      <ActionableLabeledContent
        label="Affinity"
        actionButtonProps={{
          dataTestId: 'create-affinity',
          buttonText: 'Create affinity rule',
          onClick: () => handleCreate(),
          disabled: disableActions,
        }}
      >
        {availableComponentsType(dbType, isShardingEnabled).map(
          (component: AffinityComponent) => {
            const hasRules = (rules || []).find(
              (rule) => rule.component === component
            );
            return (
              <Fragment key={component}>
                {hasRules && (
                  <Typography
                    variant="sectionHeading"
                    sx={{ marginTop: '20px' }}
                  >
                    {AffinityComponentValue[component]}
                  </Typography>
                )}
                <Stack>
                  {rules.map((rule) => (
                    <Fragment key={rule.uid}>
                      {rule.component === component && (
                        <EditableItem
                          children={<AffinityItem rule={rule} />}
                          editButtonProps={{
                            disabled: disableActions,
                            onClick: () => handleEdit(rule.uid),
                          }}
                          deleteButtonProps={{
                            disabled: disableActions,
                            onClick: () => handleDelete(rule.uid),
                          }}
                          dataTestId={'affinity-rule-editable-item'}
                          endText={`${AffinityPriorityValue[rule.priority as AffinityPriority]} ${rule.priority === AffinityPriority.Preferred && !!rule.weight ? `- ${rule.weight}` : ''}`}
                        />
                      )}
                    </Fragment>
                  ))}
                </Stack>
              </Fragment>
            );
          }
        )}
      </ActionableLabeledContent>

      {openAffinityModal && (
        <AffinityFormDialogContext.Provider
          value={{
            selectedAffinityUid,
            handleSubmit: onSubmit,
            handleClose,
            setOpenAffinityModal,
            openAffinityModal,
            affinityRules: rules,
            dbType,
            isShardingEnabled,
          }}
        >
          <AffinityFormDialog />
        </AffinityFormDialogContext.Provider>
      )}
    </Box>
  );
};
