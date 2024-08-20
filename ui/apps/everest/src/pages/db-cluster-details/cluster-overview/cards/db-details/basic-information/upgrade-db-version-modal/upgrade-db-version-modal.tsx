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

import { FormDialog } from 'components/form-dialog/form-dialog';
import {
  upgradeModalDefaultValues,
  UpgradeModalFormType,
  UpgradeModalProps,
} from './upgrade-db-version-modal.types';
import { Typography } from '@mui/material';
import { Messages } from './upgrade-db-version-modal.messages';
import { SubmitHandler } from 'react-hook-form';
import { DbVersion } from 'components/db-version';
import { dbVersionSchema } from 'components/db-version/db-version-schema';

export const UpgradeDbVersionModal = ({
  open,
  handleCloseModal,
  handleSubmitModal,
  version,
  dbVersionsUpgradeList,
}: UpgradeModalProps) => {
  const onSubmit: SubmitHandler<UpgradeModalFormType> = ({ dbVersion }) => {
    handleSubmitModal(dbVersion);
  };

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleCloseModal}
      schema={dbVersionSchema}
      headerMessage={Messages.title}
      onSubmit={onSubmit}
      submitMessage={Messages.upgrade}
      defaultValues={upgradeModalDefaultValues(version)}
    >
      <Typography variant="body1">{Messages.description}</Typography>
      <DbVersion
        availableVersions={dbVersionsUpgradeList?.availableVersions?.engine}
      />
    </FormDialog>
  );
};
