import { AffinityRule } from 'shared-types/affinity.types';
import { AffinityFormData } from '../affinity-form/affinity-form.types';
import { DbType } from '@percona/types';

export type AffinityFormDialogContextType = {
  handleSubmit: (data: AffinityFormData) => void;
  handleClose: () => void;
  selectedAffinityUid: string | null;
  setOpenAffinityModal: React.Dispatch<React.SetStateAction<boolean>>;
  openAffinityModal: boolean;
  affinityRules: AffinityRule[];
  dbType: DbType;
  isShardingEnabled: boolean;
};
