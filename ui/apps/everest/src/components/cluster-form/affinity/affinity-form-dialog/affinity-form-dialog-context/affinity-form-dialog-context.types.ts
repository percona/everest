import { AffinityRule } from 'components/cluster-form/advanced-configuration/advanced-configuration.types';
import { AffinityFormData } from '../affinity-form/affinity-form.types';
import { DbType } from '@percona/types';

export type AffinityFormDialogContextType = {
  mode: 'new' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'new' | 'edit'>>;
  handleSubmit: (data: AffinityFormData) => void;
  handleClose: () => void;
  selectedAffinityId: number;
  setOpenAffinityModal: React.Dispatch<React.SetStateAction<boolean>>;
  openAffinityModal: boolean;
  affinityRules: AffinityRule[];
  dbType: DbType;
  isShardingEnabled: boolean;
};
