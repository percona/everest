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
import { test, expect } from '@fixtures';
import { checkError, testsNs } from '@tests/tests/helpers';
import { GetDatabaseEngineResponse, GetDatabaseEnginesResponse } from '@support/types/database-engines';

test('check operators are installed', async ({ request }) => {
  const enginesList = await request.get(`/v1/namespaces/${testsNs}/database-engines`);

  await checkError(enginesList);
  const engines = (await enginesList.json() as GetDatabaseEnginesResponse).items;

  engines
    .filter((engine) => engine.spec.type !== 'postgresql')
    .forEach((engine) => {
      expect(engine.status?.status).toBe('installed');
    });
});

test('get/edit database engine versions', async ({ request }) => {
  let engineResponse = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-server-mongodb-operator`);

  await checkError(engineResponse);

  const engineData: GetDatabaseEngineResponse = await engineResponse.json();
  const availableVersions = engineData.status.availableVersions;

  expect(availableVersions.engine['7.0.12-7'].imageHash).toBe('7f00e19878bd143119772cd5468f1f0f9857dfcd2ae2f814d52ef3fa7cff6899');
  expect(availableVersions.backup['2.5.0'].status).toBe('recommended');

  const allowedVersions = ['6.0.5-4', '6.0.4-3', '5.0.7-6', '7.0.8-5', '7.0.12-7'];

  delete engineData.status;
  engineData.spec.allowedVersions = allowedVersions;

  const updateResponse = await request.put(`/v1/namespaces/${testsNs}/database-engines/percona-server-mongodb-operator`, {
    data: engineData,
  });

  await checkError(updateResponse);

  engineResponse = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-server-mongodb-operator`);
  await checkError(engineResponse);

  expect((await engineResponse.json() as GetDatabaseEngineResponse).spec.allowedVersions).toEqual(allowedVersions);
});
