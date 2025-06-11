import { ConfigForm } from './config-form';
import SectionFormWithStatus from '../section-with-status';
import { SectionKeys } from '../constants';
import { configSchema } from '../../import-schema';
import { Messages } from '../../messages';

export const ConfigSection = () => {
  return (
    <SectionFormWithStatus
      sectionSavedKey={SectionKeys.config}
      dialogTitle={Messages.config.label}
      schema={configSchema}
    >
      <ConfigForm />
    </SectionFormWithStatus>
  );
};
