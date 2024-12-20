import { createContext } from 'react';
import { AffinityFormDialogContextType } from './affinity-form-dialog-context.types';
import { DbType } from '@percona/types';

export const AffinityFormDialogContext =
  createContext<AffinityFormDialogContextType>({
    mode: 'new',
    setMode: () => {},
    handleSubmit: () => {},
    handleClose: () => {},
    selectedAffinityId: -1,
    setOpenAffinityModal: () => {},
    openAffinityModal: false,
    affinityRules: [],
    dbType: DbType.Mongo,
    isShardingEnabled: false,
  });
