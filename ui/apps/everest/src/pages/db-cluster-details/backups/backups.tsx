// everest
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

import { useBackupStorages } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackupsList } from './backups-list/backups-list';
import { ScheduleModalContext } from './backups.context.ts';
import { NoStoragesMessage } from './no-storages-message/no-storages-message';
import { ScheduledBackupModal } from './scheduled-backup-modal/scheduled-backup-modal';
import { OnDemandBackupModal } from './on-demand-backup-modal/on-demand-backup-modal';

export const Backups = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const { data = [] } = useDbClusters(namespace);
  const { data: backupStorages = [], isFetching } = useBackupStorages();
  const dbCluster = data.find(
    (cluster) => cluster.metadata.name === dbClusterName
  );

  const [mode, setMode] = useState<'new' | 'edit'>('new');
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [openOnDemandModal, setOpenOnDemandModal] = useState(false);
  const [selectedScheduleName, setSelectedScheduleName] = useState<string>('');

  if (!dbCluster || isFetching) {
    return null;
  }

  return (
    <ScheduleModalContext.Provider
      value={{
        dbCluster,
        mode,
        setMode,
        openScheduleModal,
        setOpenScheduleModal,
        selectedScheduleName,
        setSelectedScheduleName,
        openOnDemandModal,
        setOpenOnDemandModal,
      }}
    >
      {backupStorages.length === 0 ? (
        <NoStoragesMessage />
      ) : (
        <>
          <BackupsList />
          {openOnDemandModal && <OnDemandBackupModal />}
          {openScheduleModal && <ScheduledBackupModal />}
        </>
      )}
    </ScheduleModalContext.Provider>
  );
};
