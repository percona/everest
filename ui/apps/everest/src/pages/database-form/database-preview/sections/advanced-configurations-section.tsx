import { PreviewContentText } from '../preview-section';
import { AdvancedConfigurationType } from '../../database-form-schema.ts';
import { ExposureMethod } from 'components/cluster-form/advanced-configuration/advanced-configuration.types.ts';

export const AdvancedConfigurationsPreviewSection = ({
  exposureMethod,
  loadBalancerConfigName,
  engineParametersEnabled,
  engineParameters,
  storageClass,
  podSchedulingPolicyEnabled,
  podSchedulingPolicy,
}: AdvancedConfigurationType) => {
  const isExternalAccessEnabled =
    exposureMethod === ExposureMethod.LoadBalancer;

  return (
    <>
      <PreviewContentText text={`Storage class: ${storageClass ?? ''}`} />
      <PreviewContentText
        text={`Ext. access: ${isExternalAccessEnabled ? 'enabled' : 'disabled'}`}
      />
      {isExternalAccessEnabled && (
        <PreviewContentText text={`Config name: ${loadBalancerConfigName}`} />
      )}
      {engineParametersEnabled && engineParameters && (
        <PreviewContentText text="Database engine parameters set" />
      )}
      {podSchedulingPolicyEnabled && podSchedulingPolicy && (
        <PreviewContentText
          text={`Pod scheduling policy: ${podSchedulingPolicy}`}
        />
      )}
    </>
  );
};
