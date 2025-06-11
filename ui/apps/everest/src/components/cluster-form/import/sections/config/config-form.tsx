import { TextInput } from '@percona/ui-lib';
import { ImportFields } from '../../import.types';
import { Messages } from '../../messages';

export const ConfigForm = () => {
  return (
    <>
      <TextInput
        name={ImportFields.recoveryTarget}
        label={Messages.config.recoveryTarget}
        textFieldProps={{
          placeholder: Messages.enterPassword,
        }}
        isRequired
      />

      <TextInput
        name={ImportFields.recoveryTargetLSN}
        label={Messages.config.recoveryTargetLSN}
        textFieldProps={{
          placeholder: Messages.enterPassword,
        }}
        isRequired
      />

      <TextInput
        name={ImportFields.recoveryTargetXID}
        label={Messages.config.recoveryTargetXID}
        textFieldProps={{
          placeholder: Messages.enterPassword,
        }}
        isRequired
      />

      <TextInput
        name={ImportFields.recoveryTargetTime}
        label={Messages.config.recoveryTargetTime}
        textFieldProps={{
          placeholder: Messages.enterPassword,
        }}
        isRequired
      />

      <TextInput
        name={ImportFields.recoveryTargetName}
        label={Messages.config.recoveryTargetName}
        textFieldProps={{
          placeholder: Messages.enterPassword,
        }}
        isRequired
      />
    </>
  );
};
