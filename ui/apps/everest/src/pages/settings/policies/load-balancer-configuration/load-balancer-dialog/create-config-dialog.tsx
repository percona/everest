import { TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import { z } from 'zod';
import { DbEngineType } from '@percona/types';
import { rfc_123_schema } from 'utils/common-validation';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';
import { useDBEnginesForDbEngineTypes } from 'hooks';

const schema = (existingConfigs: LoadBalancerConfig[]) =>
  z.object({
    name: rfc_123_schema({
      fieldName: 'name',
      maxLength: 63,
    }).refine((val) => {
      const isNameTaken = existingConfigs.some(
        (config) => config.metadata?.name === val
      );
      return !isNameTaken;
    }, 'Config name already exists'),
    type: z.nativeEnum(DbEngineType).refine((val) => val !== undefined),
  });

interface LoadBalancerDialogProps {
  open: boolean;
  config?: LoadBalancerConfig;
  submitting?: boolean;
  existingConfigs?: LoadBalancerConfig[];
  onClose: () => void;
  onSubmit: (data: z.infer<ReturnType<typeof schema>>) => void;
}

const LoadBalancerDialog = ({
  open,
  config,
  submitting,
  existingConfigs = [],
  onClose,
  onSubmit,
}: LoadBalancerDialogProps) => {
  const [availableDbTypes] = useDBEnginesForDbEngineTypes();
  const isEditing = !!config;

  return (
    <FormDialog
      isOpen={open}
      closeModal={onClose}
      submitting={submitting}
      headerMessage={
        isEditing ? 'Edit configuration name' : 'Create configuration'
      }
      onSubmit={onSubmit}
      submitMessage={isEditing ? 'Save' : 'Create'}
      schema={schema(existingConfigs)}
      defaultValues={{
        name: config?.metadata?.name || '',
        type:
          config?.spec?.engineType ||
          (availableDbTypes.length ? availableDbTypes[0].type : undefined),
      }}
    >
      <TextInput
        name="name"
        label="Config name"
        textFieldProps={{ sx: { minHeight: '64px' } }}
        formHelperTextProps={{
          sx: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          },
        }}
      />
    </FormDialog>
  );
};

export default LoadBalancerDialog;
