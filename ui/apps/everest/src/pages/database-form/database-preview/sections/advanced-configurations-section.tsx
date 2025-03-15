import { PreviewContentText } from '../preview-section';
import { AdvancedConfigurationType } from '../../database-form-schema.ts';

export const AdvancedConfigurationsPreviewSection = ({
  externalAccess,
  engineParametersEnabled,
  engineParameters,
  storageClass,
}: AdvancedConfigurationType) => (
  <>
    <PreviewContentText text={`Storage class: ${storageClass ?? ''}`} />
    <PreviewContentText
      text={`External access ${externalAccess ? 'enabled' : 'disabled'}`}
    />
    {engineParametersEnabled && engineParameters && (
      <PreviewContentText text="Database engine parameters set" />
    )}
  </>
);
