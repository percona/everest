import { RadioGroup } from '@percona/ui-lib';
import { Messages } from './LogicalPhysicalRadioGroup.messages';

const LogicalPhysicalRadioGroup = () => (
  <RadioGroup
    name="logicalPhysical"
    label="Backup type"
    // TODO remove when physical is allowed
    controllerProps={{ defaultValue: 'logical' }}
    options={[
      {
        label: Messages.logical,
        value: 'logical',
      },
      {
        label: Messages.physical,
        value: 'physical',
        disabled: true,
      },
    ]}
  />
);
export default LogicalPhysicalRadioGroup;
