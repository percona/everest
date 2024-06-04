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

import { BackupStatus } from 'shared-types/backups.types';

// limitations under the License.
export const IP_REGEX =
  /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

export const INVALID_SOURCE_RANGE_ERROR = 'Invalid IP address range';
export const SOURCE_RANGE_PLACEHOLDER =
  'Please enter the single IP address or range using netmask (e.g. 192.168.1.1/24)';
export const DATE_FORMAT = "dd'/'MM'/'yyyy 'at' hh':'mm' 'a";
export const PITR_DATE_FORMAT = "dd'/'MM'/'yyyy 'at' hh':'mm':'ss' 'a";

export const BACKUP_STATE_TO_STATUS: Record<string, BackupStatus> = {
  Starting: BackupStatus.IN_PROGRESS,
  Running: BackupStatus.IN_PROGRESS,
  Failed: BackupStatus.FAILED,
  Succeeded: BackupStatus.OK,
  waiting: BackupStatus.IN_PROGRESS,
  requested: BackupStatus.IN_PROGRESS,
  rejected: BackupStatus.FAILED,
  running: BackupStatus.IN_PROGRESS,
  error: BackupStatus.FAILED,
  ready: BackupStatus.OK,
};

export const MAX_DB_CLUSTER_NAME_LENGTH = 22;
// export const MAX_RFC_1123_NAME_LENGTH = 63;
export const MAX_SCHEDULE_NAME_LENGTH = 57;
export const EVEREST_JWT_ISSUER = 'everest';
