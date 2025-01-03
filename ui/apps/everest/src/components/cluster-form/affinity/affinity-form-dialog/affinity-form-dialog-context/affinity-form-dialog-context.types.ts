import { AffinityRule } from 'shared-types/affinity.types';
import { AffinityFormData } from '../affinity-form/affinity-form.types';
import { DbType } from '@percona/types';

export type AffinityFormDialogContextType = {
  handleSubmit: (data: AffinityFormData) => void;
  handleClose: () => void;
  selectedAffinityId: number | null;
  setOpenAffinityModal: React.Dispatch<React.SetStateAction<boolean>>;
  openAffinityModal: boolean;
  affinityRules: AffinityRule[];
  dbType: DbType;
  isShardingEnabled: boolean;
};
