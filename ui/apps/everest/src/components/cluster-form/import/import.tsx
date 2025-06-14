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

import { SelectInput } from '@percona/ui-lib';
import { Box, MenuItem } from '@mui/material';
import { FormCardWithCheck, FormCardWithDialog } from 'components/form-card';
import { Messages } from './messages';
import { ImportFields } from './import.types';
import { S3DetailsSection } from './sections/s3-details/s3-details-section';
import { SectionKeys } from './sections/constants';
import { FileDirectorySection } from './sections/file-directory/file-directory-section';
import { DbCredentialsSection } from './sections/db-credentials/db-credentials-section';
import { ConfigSection } from './sections/config/config-section';

const dataImportersMock = ['1', '2', '3'];
export const ImportForm = () => {
  return (
    <Box>
      <>
        <FormCardWithCheck
          title={Messages.dataImporter.label}
          controlComponent={
            <SelectInput
              name={ImportFields.dataImporter}
              label={Messages.dataImporter.placeholder}
              selectFieldProps={{
                sx: { minWidth: '170px' },
              }}
            >
              {dataImportersMock.map((policy) => (
                <MenuItem value={policy} key={policy}>
                  {policy}
                </MenuItem>
              ))}
            </SelectInput>
          }
        />

        <FormCardWithDialog
          title={Messages.s3Details.label}
          content={<S3DetailsSection />}
          sectionSavedKey={SectionKeys.s3Details}
        />

        <FormCardWithDialog
          title={Messages.fileDir.label}
          content={<FileDirectorySection />}
          sectionSavedKey={SectionKeys.fileDir}
        />

        <FormCardWithDialog
          title={Messages.dbCreds.label}
          content={<DbCredentialsSection />}
          sectionSavedKey={SectionKeys.dbCreds}
        />

        <FormCardWithDialog
          title={Messages.config.label}
          content={<ConfigSection />}
          sectionSavedKey={SectionKeys.config}
          optional
        />
      </>
    </Box>
  );
};

export default ImportForm;
