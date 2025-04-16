import { MenuItem } from '@mui/material';
import { SelectInput, TextInput } from '@percona/ui-lib';
import { useDBEnginesForDbEngineTypes } from 'hooks';
import { humanizeDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { FormDialog } from 'components/form-dialog';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: z.infer<typeof schema>) => void;
};

const PoliciesDialog = ({ open, onClose, onSubmit }: Props) => {
  const [availableDbTypes] = useDBEnginesForDbEngineTypes(undefined, {
    refetchInterval: 30 * 1000,
  });

  return (
    <FormDialog
      isOpen={open}
      closeModal={onClose}
      headerMessage="Create policy"
      onSubmit={onSubmit}
      schema={schema}
      defaultValues={{
        name: '',
        type: availableDbTypes.length ? availableDbTypes[0].type : '',
      }}
    >
      <TextInput name="name" label="Policy name" />
      <SelectInput name="type" label="Technology">
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
