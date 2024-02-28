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
import { expect, test } from '@fixtures';

class Output {
  command: string;
  code: number;
  stdout: string;
  stderr: string;

  constructor(command: string, exitCode: number, stdOut: string, stdErr: string) {
    this.command = command;
    this.code = exitCode;
    this.stdout = stdOut;
    this.stderr = stdErr;
  }

  getStdOutLines(): string[] {
    return this.stdout.trim().split('\n').filter((item) => item.trim().length > 0);
  }

  async assertSuccess() {
    await test.step(`Verify "${this.command}" command executed successfully`, async () => {
      expect(this.code, `"${this.command}" expected to exit with 0! Error: "${this.stderr || this.stdout}"`).toEqual(0);
    });
  }

  async exitCodeEquals(expectedValue: number) {
    await test.step(`Verify "${this.command}" command exit code is ${expectedValue}`, async () => {
      expect(this.code, `"${this.command}" expected to exit with ${expectedValue}! Output: "${this.stdout}"`).toEqual(expectedValue);
    });
  }

  async outContains(expectedValue: string) {
    await test.step(`Verify command output contains ${expectedValue}`, async () => {
      expect(this.stdout, `Stdout does not contain ${expectedValue}!`).toContain(expectedValue);
    });
  }

  async outNotContains(expectedValue: string[]) {
    for (const v of expectedValue) {
      await test.step(`Verify command output contains ${v}`, async () => {
        expect(this.stdout, `Stdout does not contain ${v}!`).not.toContain(v);
      });
    }
  }

  async outContainsNormalizedMany(expectedValues: string[]) {
    for (const val of expectedValues) {
      await test.step(`Verify command output contains ${val}`, async () => {
        expect.soft(this.stdout.replace(/ +(?= )/g, ''), `Stdout does not contain '${val}'!`).toContain(val);
      });
    }

    expect(
      test.info().errors,
      `'Contains all elements' failed with ${test.info().errors.length} error(s):\n${this.getErrors()}`,
    ).toHaveLength(0);
  }

  async outErrContainsNormalizedMany(expectedValues: string[]) {
    for (const val of expectedValues) {
      await test.step(`Verify command stderr contains ${val}`, async () => {
        expect.soft(this.stderr.replace(/ +(?= )/g, ''), `Stdout does not contain '${val}'!`).toContain(val);
      });
    }

    expect(
      test.info().errors,
      `'Contains all elements' failed with ${test.info().errors.length} error(s):\n${this.getErrors()}`,
    ).toHaveLength(0);
  }

  async outEqualsNormalizedMany(expectedValues: string[]) {
    const out = this.stdout.replace(/ +(?= )/g, '')
      .split('\n').filter((el) => el !== '')
      .map((el) => el.trim());

    await test.step('Verify command output is correct', async () => {
      expect(out, 'Stdout does not match expected value!').toMatchObject(expectedValues);
    });
  }

  async outContainsMany(expectedValues: string[]) {
    for (const val of expectedValues) {
      await test.step(`Verify command output contains ${val}`, async () => {
        expect.soft(this.stdout, `Stdout does not contain '${val}'!`).toContain(val);
      });
    }

    expect(
      test.info().errors,
      `'Contains all elements' failed with ${test.info().errors.length} error(s):\n${this.getErrors()}`,
    ).toHaveLength(0);
  }

  private getErrors(): string {
    const errors: string[] = [];

    for (const obj of test.info().errors) {
      errors.push(`\t${obj.message.split('\n')[0]}`);
    }

    return errors.join('\n');
  }
}

export default Output;
