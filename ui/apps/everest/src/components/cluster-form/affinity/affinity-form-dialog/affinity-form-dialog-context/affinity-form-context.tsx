import { createContext } from 'react';
import { AffinityFormDialogContextType } from './affinity-form-dialog-context.types';
import { DbType } from '@percona/types';

export const AffinityFormDialogContext =
  createContext<AffinityFormDialogContextType>({
    handleSubmit: () => {},
    handleClose: () => {},
    selectedAffinityUid: null,
    setOpenAffinityModal: () => {},
    openAffinityModal: false,
    affinityRules: [],
    dbType: DbType.Mongo,
    isShardingEnabled: false,
  });
