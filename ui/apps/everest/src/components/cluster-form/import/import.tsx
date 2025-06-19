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
import { useState } from 'react';
import { DbWizardFormFields } from 'consts';
import { useFormContext } from 'react-hook-form';
import { dbTypeToDbEngine } from '@percona/utils';
import { useDataImporters } from 'hooks/api/data-importers/useDataImporters';

export const ImportForm = () => {
  const [showCreds, setShowCreds] = useState(false);
  const { getValues } = useFormContext();
  const selectedEngine = dbTypeToDbEngine(getValues(DbWizardFormFields.dbType));
  const { data: dataImporters } = useDataImporters(selectedEngine);

  return (
    <Box>
      <>
        <FormCardWithCheck
          title={Messages.dataImporter.label}
          controlComponent={
            <SelectInput
              controllerProps={{
                name: ImportFields.dataImporter,
                defaultValue: '',
              }}
              name={ImportFields.dataImporter}
              label={Messages.dataImporter.placeholder}
              selectFieldProps={{
                sx: { minWidth: '170px' },
              }}
            >
              {dataImporters?.items.map((dataImporter) => (
                <MenuItem
                  value={dataImporter.metadata.name}
                  key={dataImporter.metadata.name}
                  onClick={() =>
                    setShowCreds(
                      dataImporter.spec.databaseClusterConstraints.requiredFields.includes(
                        'userSecretName'
                      )
                    )
                  }
                >
                  {dataImporter.metadata.name}
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
        {showCreds && (
          <FormCardWithDialog
            title={Messages.dbCreds.label}
            content={<DbCredentialsSection />}
            sectionSavedKey={SectionKeys.dbCreds}
          />
        )}
      </>
    </Box>
  );
};

export default ImportForm;
