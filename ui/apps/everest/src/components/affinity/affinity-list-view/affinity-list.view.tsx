import { Stack, Typography } from '@mui/material';
import { DbType } from '@percona/types';
import { ActionableLabeledContent } from '@percona/ui-lib';
import {
  AffinityComponent,
  AffinityComponentValue,
  AffinityPriority,
  AffinityPriorityValue,
  AffinityRule,
} from 'components/cluster-form/advanced-configuration/advanced-configuration.types';
import EditableItem from 'components/editable-item';
import { useState } from 'react';
import { AffinityFormDialog } from '../affinity-form-dialog/affinity-form-dialog';
import { AffinityFormDialogContext } from '../affinity-form-dialog/affinity-form-dialog-context/affinity-form-context';
import { AffinityFormData } from '../affinity-form-dialog/affinity-form/affinity-form.types';
import { availableComponentsType } from '../affinity-utils';
import { AffinityItem } from './affinity-item';

export const AffinityListView = ({
  mode,
  setMode,
  affinityRules,
  handleDelete,
  handleSubmit,
  dbType,
  isShardingEnabled = false,
}: {
  mode: 'new' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'new' | 'edit'>>;
  affinityRules: AffinityRule[];
  handleDelete: (idx: number) => void;
  handleSubmit: (data: AffinityFormData, selectedAffinityId: number) => void;
  dbType: DbType;
  isShardingEnabled?: boolean;
}) => {
  const [selectedAffinityId, setSelectedAffinityId] = useState<number>(-1);
  const [openAffinityModal, setOpenAffinityModal] = useState(false);

  const handleCreate = () => {
    setMode('new');
    setOpenAffinityModal(true);
  };

  const handleEdit = (idx: number) => {
    setSelectedAffinityId(idx);
    setMode('edit');
    setOpenAffinityModal(true);
  };

  const handleClose = () => {
    setOpenAffinityModal(false);
  };

  const onSubmit = (data: AffinityFormData) => {
    handleSubmit(data, selectedAffinityId);
    setSelectedAffinityId(-1);
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
            const hasRules = (affinityRules || []).find(
              (rule) => rule.component === component
            );
            return (
              <>
                {hasRules && (
                  <Typography
                    variant="sectionHeading"
                    sx={{ marginTop: '20px' }}
                  >
                    {AffinityComponentValue[component]}
                  </Typography>
                )}
                <Stack>
                  {affinityRules.map((rule, idx) => (
                    <>
                      {rule.component === component && (
                        <EditableItem
                          key={idx}
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
                    </>
                  ))}
                </Stack>
              </>
            );
          }
        )}
      </ActionableLabeledContent>

      {openAffinityModal && (
        <AffinityFormDialogContext.Provider
          value={{
            mode,
            setMode,
            selectedAffinityId,
            handleSubmit: onSubmit,
            handleClose,
            setOpenAffinityModal,
            openAffinityModal,
            affinityRules,
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
