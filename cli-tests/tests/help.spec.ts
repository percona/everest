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
import { test } from '@fixtures';

test.describe('Everest CLI "--help" validation', async () => {
  test('top level --help', async ({ cli }) => {
    const out = await cli.everestExecSilent('--help');

    await out.assertSuccess();
    await out.outContainsNormalizedMany([
      'Usage:',
      'everestctl [command]',
      'Available Commands:',
      'completion Generate the autocompletion script for the specified shell',
      'help Help about any command',
      'install',
      'Flags:',
      '-h, --help help for everest',
      'Use "everestctl [command] --help" for more information about a command.',
    ]);
  });

  test('top level help', async ({ cli }) => {
    const out = await cli.everestExecSilent('help');

    await out.assertSuccess();
    await out.outContainsNormalizedMany([
      'Usage:',
      'everestctl [command]',
      'Available Commands:',
      'completion Generate the autocompletion script for the specified shell',
      'help Help about any command',
      'install',
      'Flags:',
      '-h, --help help for everest',
      'Use "everestctl [command] --help" for more information about a command.',
    ]);
  });

  test('completion --help', async ({ cli }) => {
    const out = await cli.everestExecSilent('completion --help');

    await out.assertSuccess();
    await out.outContainsNormalizedMany([
      'Generate the autocompletion script for everestctl for the specified shell.',
      "See each sub-command's help for details on how to use the generated script.",
      'Usage:',
      'everestctl completion [command]',
      'Available Commands:',
      'bash Generate the autocompletion script for bash',
      'fish Generate the autocompletion script for fish',
      'powershell Generate the autocompletion script for powershell',
      'zsh Generate the autocompletion script for zsh',
      'Flags:',
      '-h, --help help for completion',
      'Use "everestctl completion [command] --help" for more information about a command.',
    ]);
  });

  test('completion bash --help', async ({ cli }) => {
    const out = await cli.everestExecSilent('completion bash --help');

    await out.assertSuccess();
    await out.outContainsNormalizedMany([
      'Generate the autocompletion script for the bash shell.',
      "This script depends on the 'bash-completion' package.",
      '-h, --help help for bash',
      '--no-descriptions disable completion descriptions',
    ]);
  });

  test('install --help', async ({ cli }) => {
    const out = await cli.everestExecSilent('install --help');

    await out.assertSuccess();
    await out.outContainsNormalizedMany([
      'Usage:',
      'Flags:',
      '-h, --help',
      '-k, --kubeconfig',
      '--skip-wizard',
    ]);
  });
});
