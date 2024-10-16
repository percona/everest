import { AdvancedConfigurationFormType } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
import { DbCluster } from 'shared-types/dbCluster.types';

export interface AdvancedConfigurationModalProps {
  open: boolean;
  handleCloseModal: () => void;
  handleSubmitModal: (props: AdvancedConfigurationFormType) => void;
  dbCluster: DbCluster;
  // submitting: boolean;
}
