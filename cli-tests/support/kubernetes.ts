// percona-everest-cli
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
import { CliHelper } from '@tests/helpers/cliHelper';

export async function waitForDBEngines(cli: CliHelper) {
  const out = await cli.execSilent('kubectl -n percona-everest get dbengine -o json');

  await out.assertSuccess();

  const res = JSON.parse(out.stdout);
  const installed = res.items.filter((i) => i.status.status === 'installed');

  for (const engine of ['pxc', 'psmdb', 'postgresql']) {
    if (!res?.items || res?.items.findIndex((i) => i.spec.type === engine) === -1) {
      return `dbengine ${engine} not yet available`;
    }
  }

  return installed.length === res.items.length;
}
