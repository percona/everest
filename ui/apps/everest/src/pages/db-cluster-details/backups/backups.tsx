// percona-everest-frontend
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Alert } from '@mui/material';
import { useBackupStorages } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackupsList } from './backups-list/backups-list';
import { ScheduleModalContext } from './backups.context.ts';
import { Messages } from './backups.messages.ts';
import { NoStoragesMessage } from './no-storages-message/no-storages-message.tsx';
import { ScheduledBackupModal } from './scheduled-backup-modal/scheduled-backup-modal';
import { ScheduledBackupsList } from './scheduled-backups-list/scheduled-backups-list';

export const Backups = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const { data = [] } = useDbClusters(namespace);
  const { data: backupStorages = [] } = useBackupStorages();
  const dbNameExists = data.find(
    (cluster) => cluster.metadata.name === dbClusterName
  );
  const { data: dbCluster } = useDbCluster(dbClusterName || '', namespace, {
    enabled: !!dbClusterName && !!dbNameExists,
  });

  const [mode, setMode] = useState<'new' | 'edit'>('new');
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [selectedScheduleName, setSelectedScheduleName] = useState<string>('');

  return (
    <ScheduleModalContext.Provider
      value={{
        mode,
        setMode,
        openScheduleModal,
        setOpenScheduleModal,
        selectedScheduleName,
        setSelectedScheduleName,
      }}
    >
      {backupStorages.length === 0 ? (
        <NoStoragesMessage />
      ) : (
        dbNameExists && (
          <>
            {!dbCluster?.spec?.backup?.enabled && (
              <Alert severity="info">{Messages.backupsDisabled}</Alert>
            )}
            <ScheduledBackupsList />
            <BackupsList />
            {openScheduleModal && <ScheduledBackupModal />}
          </>
        )
      )}
    </ScheduleModalContext.Provider>
  );
};
