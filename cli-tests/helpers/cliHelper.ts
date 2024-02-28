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
import Output from '@support/output';
import shell from 'shelljs';

export class CliHelper {
  constructor(private pathToBinary = '../bin/everest') {}

  /**
   * Shell(sh) exec() wrapper to use outside {@link test}
   * returns handy {@link Output} object.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async execute(command: string): Promise<Output> {
    const { stdout, stderr, code } = shell.exec(command.replace(/(\r\n|\n|\r)/gm, ''), {
      silent: false,
    });

    // if (stdout.length > 0) console.log(`Out: "${stdout}"`);

    // if (stderr.length > 0) console.log(`Error: "${stderr}"`);

    return new Output(command, code, stdout, stderr);
  }

  /**
   * Shell(sh) exec() wrapper to return handy {@link Output} object.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async exec(command: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return test.step(`Run "${command}" command`, async () => {
      return this.execute(command);
    });
  }

  /**
   * Same as {@link exec()} but with "--skip-wizard" suffix.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async everestExec(command: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return test.step(`Run "${command}" command`, async () => {
      return this.execute(`${this.pathToBinary} ${command}`);
    });
  }

  /**
   * Same as {@link exec()} but with "--skip-wizard" suffix.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async everestExecSkipWizard(command: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return test.step(`Run "${command}" command with --skip-wizard`, async () => {
      return this.execute(`${this.pathToBinary} ${command} --skip-wizard`);
    });
  }

  async everestExecSkipWizardWithEnv(command, env: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return test.step(`Run "${command}" command with env variables`, async () => {
      return this.execute(`${env} ${this.pathToBinary} ${command} --skip-wizard`);
    });
  }

  /**
   * Silent Shell(sh) exec() wrapper to return handy {@link Output} object.
   * Provides no logs to skip huge outputs.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async execSilent(command: string): Promise<Output> {
    const { stdout, stderr, code } = await test.step(`Run "${command}" command`, async () => {
      return shell.exec(command.replace(/(\r\n|\n|\r)/gm, ''), {
        silent: true,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new Output(command, code, stdout, stderr);
  }

  /**
   * Silent Shell(sh) exec() wrapper to return handy {@link Output} object.
   * Provides no logs to skip huge outputs.
   *
   * @param       command   sh command to execute
   * @return      {@link Output} instance
   */
  async everestExecSilent(command: string): Promise<Output> {
    const { stdout, stderr, code } = await test.step(`Run everest "${command}" command`, async () => {
      return shell.exec(`${this.pathToBinary} ${command}`.replace(/(\r\n|\n|\r)/gm, ''), {
        silent: true,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new Output(command, code, stdout, stderr);
  }
}
