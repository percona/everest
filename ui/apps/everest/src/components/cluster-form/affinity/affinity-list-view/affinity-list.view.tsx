import { Stack, Typography } from '@mui/material';
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
import { Fragment, useEffect, useState } from 'react';
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
}: {
  initialRules?: AffinityRule[];
  onRulesChange: (newRules: AffinityRule[]) => void;
  dbType: DbType;
  isShardingEnabled?: boolean;
}) => {
  const [selectedAffinityId, setSelectedAffinityId] = useState<number | null>(
    null
  );
  const [openAffinityModal, setOpenAffinityModal] = useState(false);
  const [rules, setRules] = useState<AffinityRule[]>(initialRules);

  useEffect(() => onRulesChange(rules), [rules, onRulesChange]);

  const handleCreate = () => {
    setOpenAffinityModal(true);
  };

  const handleEdit = (idx: number) => {
    setSelectedAffinityId(idx);
    setOpenAffinityModal(true);
  };

  const handleClose = () => {
    setOpenAffinityModal(false);
  };

  const handleDelete = (idx: number) => {
    setRules((oldRules) => oldRules.filter((_, i) => i !== idx));
  };

  const onSubmit = (data: AffinityFormData) => {
    setRules((oldRules) => {
      let newRules: AffinityRule[] = [];
      const addedRule = convertFormDataToAffinityRule(data);
      if (selectedAffinityId === null) {
        newRules = [...oldRules, addedRule];
      } else {
        newRules = [...oldRules];
        newRules[selectedAffinityId] = addedRule;
      }
      return newRules;
    });
    setSelectedAffinityId(null);
    setOpenAffinityModal(false);
  };

  return (
    <>
      <ActionableLabeledContent
        label="Affinity"
        actionButtonProps={{
          dataTestId: 'create-affinity',
          buttonText: 'Create affinity rule',
          onClick: () => handleCreate(),
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
                  {rules.map((rule, idx) => (
                    <Fragment key={rule.uid}>
                      {rule.component === component && (
                        <EditableItem
                          children={<AffinityItem rule={rule} />}
                          editButtonProps={{
                            onClick: () => handleEdit(idx),
                          }}
                          deleteButtonProps={{
                            onClick: () => handleDelete(idx),
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
            selectedAffinityId,
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
    </>
  );
};
