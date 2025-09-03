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
import {expect, test} from '@fixtures'
import * as th from "@tests/tests/helpers";

test.describe('Backup Storage tests', {tag: ['@backup-storage']}, () => {
  test('add/list/get/delete s3 backup storage success', async ({request, page}) => {
    const bsName = th.limitedSuffixedName('bs-s3'),
      payload = th.getBackupStorageS3Payload(bsName)

      try {
        await test.step('create backup storage', async () => {
          const created = await th.createBackupStorageWithData(request, payload)
          expect(created.name).toBe(payload.name)
          expect(created.bucketName).toBe(payload.bucketName)
          expect(created.type).toBe(payload.type)
          expect(created.description).toBe(payload.description)
        });

        await test.step('list backup storages', async () => {
          const res = await th.listBackupStorages(request)
          expect(res.length).toBeGreaterThan(0)
        });

        await test.step('get backup storage', async () => {
          const res = await th.getBackupStorage(request, bsName)
          expect(res.name).toBe(payload.name)
        });

        await test.step('update backup storage', async () => {
          const updatePayload = {
            description: 'some description',
            bucketName: `${payload.bucketName}-upd`,
            accessKey: 'otherAccessKey',
            secretKey: 'otherSecret',
            allowedNamespaces: [th.testsNs]
          }

          await expect(async () => {
            const res = await th.updateBackupStorage(request, bsName, updatePayload)
            expect(res.bucketName).toBe(updatePayload.bucketName)
            expect(res.region).toBe(payload.region)
            expect(res.type).toBe(payload.type)
            expect(res.description).toBe(updatePayload.description)
          }).toPass({
            intervals: [1000],
            timeout: 30 * 1000,
          })
        });

        await test.step('create backup storage already exists', async () => {
          const createAgain = await th.createBackupStorageWithDataRaw(request, payload)
          expect(createAgain.status()).toBe(409)
        });

        await test.step('delete backup storage', async () => {
          await th.deleteBackupStorage(page, request, bsName)
        });
      } finally {
        await th.deleteBackupStorage(page, request, bsName)
      }
  })

  test('add/list/get/delete azure backup storage success', async ({request, page}) => {
    const bsName = th.limitedSuffixedName('bs-azure'),
      payload = th.getBackupStorageAzurePayload(bsName)

      try {
        await test.step('create backup storage', async () => {
          const created = await th.createBackupStorageWithData(request, payload)
          expect(created.name).toBe(payload.name)
          expect(created.bucketName).toBe(payload.bucketName)
          expect(created.type).toBe(payload.type)
          expect(created.description).toBe(payload.description)
        });

        await test.step('list backup storages', async () => {
          const res = await th.listBackupStorages(request)
          expect(res.length).toBeGreaterThan(0)
        });

        await test.step('get backup storage', async () => {
          const res = await th.getBackupStorage(request, bsName)
          expect(res.name).toBe(payload.name)
        });

        await test.step('update backup storage', async () => {
          const updatePayload = {
            description: 'some description',
            bucketName: `${payload.bucketName}-upd`,
          }

          await expect(async () => {
            const res = await th.updateBackupStorage(request, bsName, updatePayload)
            expect(res.bucketName).toBe(updatePayload.bucketName)
            expect(res.region).toBe(payload.region)
            expect(res.type).toBe(payload.type)
            expect(res.description).toBe(updatePayload.description)
          }).toPass({
            intervals: [1000],
            timeout: 30 * 1000,
          })
        });

        await test.step('create backup storage already exists', async () => {
          const createAgain = await th.createBackupStorageWithDataRaw(request, payload)
          expect(createAgain.status()).toBe(409)
        });

        await test.step('delete backup storage', async () => {
          await th.deleteBackupStorage(page, request, bsName)
        });
      } finally {
        await th.deleteBackupStorage(page, request, bsName)
      }
  })

  test('create backup storage failures', async ({request}) => {
    const testCases = [
        {
            payload: {},
            errorText: 'property "name" is missing',
        },
        {
            payload: {
                type: 's3',
                name: th.limitedSuffixedName('bs-create-fail-secretKey'),
                bucketName: 'percona-test-backup-storage',
                region: 'us-east-2',
                accessKey: 'ssdssd',
            },
            errorText: 'property "secretKey" is missing',
        },
        {
            payload: {
                type: 's3',
                name: 'Backup Name',
                bucketName: 'percona-test-backup-storage',
                region: 'us-west-2',
                accessKey: 'ssdssd',
                secretKey: 'ssdssdssdssd',
                allowedNamespaces: [th.testsNs]
            },
            errorText: '\'name\' is not RFC 1035 compatible',
        },
        {
            payload: {
                type: 's3',
                name: th.limitedSuffixedName('bs-create-fail-url'),
                bucketName: 'percona-test-backup-storage',
                url: 'not-valid-url',
                region: 'us-east-2',
                accessKey: 'ssdssd',
                secretKey: 'ssdssdssdssd',
                allowedNamespaces: [th.testsNs]
            },
            errorText: '\'url\' is an invalid URL',
        },
        {
            payload: {
                type: 's3',
                name: th.limitedSuffixedName('bs-create-fail-region'),
                bucketName: 'invalid',
                accessKey: 'ssdssd',
                secretKey: 'ssdssdssdssd',
                allowedNamespaces: [th.testsNs]
            },
            errorText: 'region is required',
        },
        {
            payload: {
                type: 'gcs',
                name: th.limitedSuffixedName('bs-create-fail-type'),
                region: 'us-east-2',
                bucketName: 'invalid',
                accessKey: 'ssdssd',
                secretKey: 'ssdssdssdssd',
                allowedNamespaces: [th.testsNs]
            },
            errorText: '"/type": value is not one of the allowed values',
        },
    ]

    for (const testCase of testCases) {
      const response = await th.createBackupStorageWithDataRaw(request, testCase.payload)

      expect(response.status()).toBe(400)
      expect((await response.json()).message).toMatch(testCase.errorText)
    }
  })

  test('update backup storage failures', async ({request, page}) => {
    const name= th.limitedSuffixedName('bs-upd-fail'),
      createPayload = {
        type: 's3',
        name: name,
        bucketName: `${name}-bucket`,
        region: 'us-east-2',
        accessKey: 'sdfsdfs',
        secretKey: 'lkdfslsldfka',
        allowedNamespaces: [th.testsNs]
      }

      try {
        await test.step('create backup storage', async () => {
          await th.createBackupStorageWithData(request, createPayload)
        });

        const testCases = [
          {
            payload: {
              url: '-asldf;asdfk;sadf',
            },
            errorText: '\'url\' is an invalid URL',
          },
          {
            payload: {
              bucket: '-asldf;asdfk;sadf',
            },
            errorText: 'request body has an error: doesn\'t match schema #/components/schemas/UpdateBackupStorageParams: property "bucket" is unsupported',
          },
        ]

        await test.step('update backup storage', async () => {
          for (const testCase of testCases) {
            await expect(async () => {
              const response = await th.updateBackupStorageRaw(request, name, testCase.payload)
              expect(response.status()).toBe(400)
              expect((await response.json()).message).toMatch(testCase.errorText)
            }).toPass({
              intervals: [1000],
              timeout: 30 * 1000,
            })
          }
        });
      } finally {
        await th.deleteBackupStorage(page, request, name)
      }
  })

  test('update: backup storage not found', async ({request}) => {
    const name = th.limitedSuffixedName('bs-non-existent'),
      data =  { bucketName: 's3' },
      response = await th.updateBackupStorageRaw(request, name, data)

    expect(response.status()).toBe(404)
  })

  test('delete: backup storage not found', async ({request}) => {
    const name = th.limitedSuffixedName('bs-non-existent'),
      response = await th.deleteBackupStorageRaw(request, name)

    expect(response.status()).toBe(404)
  })

  test('get: backup storage not found', async ({request}) => {
    const name = th.limitedSuffixedName('bs-non-existent'),
      response = await th.getBackupStorageRaw(request, name)

    expect(response.status()).toBe(404)
  })
});