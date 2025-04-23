import { MenuItem } from '@mui/material';
import { SelectInput, TextInput } from '@percona/ui-lib';
import { useDBEnginesForDbEngineTypes } from 'hooks';
import { humanizeDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { FormDialog } from 'components/form-dialog';
import { z } from 'zod';
import { DbEngineType } from '@percona/types';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';

const schema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DbEngineType).refine((val) => val !== undefined),
});

type Props = {
  open: boolean;
  policy?: PodSchedulingPolicy;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (data: z.infer<typeof schema>) => void;
};

const PoliciesDialog = ({
  open,
  policy,
  submitting,
  onClose,
  onSubmit,
}: Props) => {
  const [availableDbTypes] = useDBEnginesForDbEngineTypes();
  const isEditing = !!policy;

  return (
    <FormDialog
      isOpen={open}
      closeModal={onClose}
      submitting={submitting}
      headerMessage={isEditing ? 'Edit policy details' : 'Create policy'}
      onSubmit={onSubmit}
      submitMessage={isEditing ? 'Save' : 'Create'}
      schema={schema}
      defaultValues={{
        name: policy?.metadata.name || '',
        type:
          policy?.spec.engineType ||
          (availableDbTypes.length ? availableDbTypes[0].type : undefined),
      }}
    >
      <TextInput name="name" label="Policy name" />
      <SelectInput
        name="type"
        label="Technology"
        selectFieldProps={{ disabled: isEditing }}
      >
        {availableDbTypes.map((item) => (
          <MenuItem
            data-testid={`add-db-cluster-button-${item.type}`}
            disabled={!item.available}
            key={item.type}
            value={item.type}
          >
            {humanizeDbType(dbEngineToDbType(item.type))}
          </MenuItem>
        ))}
      </SelectInput>
    </FormDialog>
  );
};

export default PoliciesDialog;
