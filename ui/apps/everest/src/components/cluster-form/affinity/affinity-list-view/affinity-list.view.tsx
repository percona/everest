import { BoxProps, Stack, Typography } from '@mui/material';
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
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import RoundedBox from 'components/rounded-box';

export const AffinityListView = ({
  onRulesChange,
  dbType,
  initialRules = [],
  rules,
  isShardingEnabled = false,
  disableActions = false,
  boxProps = { sx: {} },
}: {
  initialRules?: AffinityRule[];
  // 'rules' make this component controlled
  rules?: AffinityRule[];
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
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [internalRules, setInternalRules] =
    useState<AffinityRule[]>(initialRules);
  const { sx: boxSx, ...rest } = boxProps;
  const controlled = rules !== undefined;

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

  const onDeleteClick = (ruleUid: string) => {
    setSelectedAffinityUid(ruleUid);
    setOpenDeleteModal(true);
  };

  const handleDelete = () => {
    const newRules = internalRules.filter(
      ({ uid }) => uid !== selectedAffinityUid
    );
    updateRules(newRules);
    setOpenDeleteModal(false);
  };

  const onSubmit = (data: AffinityFormData) => {
    let newRules: AffinityRule[] = [];
    const addedRule = convertFormDataToAffinityRule(data);

    if (selectedAffinityUid === null) {
      newRules = [...internalRules, addedRule];
    } else {
      newRules = [...internalRules];
      const ruleIdx = newRules.findIndex(
        ({ uid }) => uid === selectedAffinityUid
      );

      if (ruleIdx !== -1) {
        newRules[ruleIdx] = addedRule;
      }
    }
    updateRules(newRules);
    setOpenAffinityModal(false);
  };

  const updateRules = (newRules: AffinityRule[]) => {
    setSelectedAffinityUid(null);
    onRulesChange(newRules);

    if (!controlled) {
      setInternalRules(newRules);
    }
  };

  const closeModal = () => {
    setSelectedAffinityUid(null);
    setOpenDeleteModal(false);
  };

  useEffect(() => {
    if (rules && Array.isArray(rules)) {
      setInternalRules(rules);
    }
  }, [rules]);

  return (
    <RoundedBox
      sx={{
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
        verticalStackSx={{
          mt: 0,
        }}
        horizontalStackSx={{
          mb: 0,
        }}
      >
        {availableComponentsType(dbType, isShardingEnabled).map(
          (component: AffinityComponent) => {
            const hasRules = (internalRules || []).find(
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
                  {internalRules.map((rule) => (
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
                            onClick: () => onDeleteClick(rule.uid),
                          }}
                          dataTestId={'affinity-rule-editable-item'}
                          endText={`${AffinityPriorityValue[rule.priority]} ${rule.priority === AffinityPriority.Preferred && !!rule.weight ? `- ${rule.weight}` : ''}`}
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

      <AffinityFormDialogContext.Provider
        value={{
          selectedAffinityUid,
          handleSubmit: onSubmit,
          handleClose,
          setOpenAffinityModal,
          openAffinityModal,
          affinityRules: internalRules,
          dbType,
          isShardingEnabled,
        }}
      >
        {openAffinityModal && <AffinityFormDialog />}
      </AffinityFormDialogContext.Provider>
      <ConfirmDialog
        isOpen={openDeleteModal}
        selectedId={selectedAffinityUid!}
        handleConfirm={handleDelete}
        closeModal={closeModal}
        headerMessage="Delete affinity rule"
      >
        Are you sure you want to delete this affinity rule?
      </ConfirmDialog>
    </RoundedBox>
  );
};
