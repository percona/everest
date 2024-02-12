// percona-everest-backend
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
import http from 'http'
import { expect, test } from '@fixtures'
import { APIRequestContext } from '@playwright/test'
import {checkError, testsNs} from "@tests/tests/helpers";

// testPrefix is used to differentiate between several workers
// running this test to avoid conflicts in instance names
const testPrefix = `t${(Math.random() + 1).toString(36).substring(10)}`

test.afterEach(async ({ request }, testInfo) => {
  const result = await request.get('/v1/monitoring-instances')
  const list = await result.json()

  for (const i of list) {
    if (!i.name.includes(testPrefix)) {
      continue
    }

    await request.delete(`/v1/monitoring-instances/${i.name}`)
  }
})

test('create monitoring instance with api key', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${testPrefix}-key`,
    url: 'http://monitoring',
    targetNamespaces: [testsNs],
    pmm: {
      apiKey: '123',
    },
  }

  const response = await request.post('/v1/monitoring-instances', { data })

  await checkError(response)
  const created = await response.json()

  expect(created.name).toBe(data.name)
  expect(created.url).toBe(data.url)
  expect(created.type).toBe(data.type)
})

test('create monitoring instance with user/password', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${testPrefix}-pass`,
    url: 'http://127.0.0.1:8888',
    targetNamespaces: [testsNs],
    pmm: {
      user: 'admin',
      password: 'admin',
    },
  }

  const response = await request.post('/v1/monitoring-instances', { data })

  await checkError(response)
  const created = await response.json()

  expect(created.name).toBe(data.name)
  expect(created.url).toBe(data.url)
  expect(created.type).toBe(data.type)
})

test('create monitoring instance missing pmm', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: 'monitoring-fail',
    url: 'http://monitoring-instance',
    targetNamespaces: [testsNs],
  }

  const response = await request.post('/v1/monitoring-instances', { data })

  expect(response.status()).toBe(400)
})

test('create monitoring instance missing pmm credentials', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: 'monitoring-fail',
    url: 'http://monitoring-instance',
    targetNamespaces: [testsNs],
    pmm: {},
  }

  const response = await request.post('/v1/monitoring-instances', { data })

  expect(response.status()).toBe(400)
})

test('list monitoring instances', async ({ request }) => {
  const namePrefix = 'list-'

  await createInstances(request, namePrefix)

  const response = await request.get('/v1/monitoring-instances')

  await checkError(response)
  const list = await response.json()

  expect(list.filter((i) => i.name.startsWith(`${namePrefix}${testPrefix}`)).length).toBe(3)
})

test('get monitoring instance', async ({ request }) => {
  const namePrefix = 'get-'
  const names = await createInstances(request, namePrefix)
  const name = names[1]

  const response = await request.get(`/v1/monitoring-instances/${name}`)

  await checkError(response)
  const i = await response.json()

  expect(i.name).toBe(name)
})

test('delete monitoring instance', async ({ request }) => {
  const namePrefix = 'del-'
  const names = await createInstances(request, namePrefix)
  const name = names[1]

  let response = await request.get('/v1/monitoring-instances')

  await checkError(response)
  let list = await response.json()

  expect(list.filter((i) => i.name.startsWith(`${namePrefix}${testPrefix}`)).length).toBe(3)

  response = await request.delete(`/v1/monitoring-instances/${name}`)
  await checkError(response)

  response = await request.get('/v1/monitoring-instances')
  await checkError(response)
  list = await response.json()

  expect(list.filter((i) => i.name.startsWith(`${namePrefix}${testPrefix}`)).length).toBe(2)
})

test('patch monitoring instance', async ({ request }) => {
  const names = await createInstances(request, 'patch-monit-')
  const name = names[1]

  const response = await request.get(`/v1/monitoring-instances/${name}`)

  await checkError(response)
  const created = await response.json()

  const patchData = { url: 'http://monitoring' }
  const updated = await request.patch(`/v1/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()

  expect(getJson.url).toBe(patchData.url)
  expect(getJson.apiKeySecretId).toBe(created.apiKeySecretId)
})

test('patch monitoring instance secret key changes', async ({ request }) => {
  const names = await createInstances(request, 'patch-monit-')
  const name = names[1]

  const response = await request.get(`/v1/monitoring-instances/${name}`)

  await checkError(response)
  const created = await response.json()

  const patchData = {
    url: 'http://monitoring2',
    pmm: {
      apiKey: 'asd',
    },
  }
  const updated = await request.patch(`/v1/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()

  expect(getJson.url).toBe(patchData.url)
})

test('patch monitoring instance type updates properly', async ({ request }) => {
  const names = await createInstances(request, 'patch-monit-')
  const name = names[1]

  const response = await request.get(`/v1/monitoring-instances/${name}`)

  await checkError(response)

  const patchData = {
    type: 'pmm',
    pmm: {
      apiKey: 'asd',
    },
  }
  const updated = await request.patch(`/v1/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()
})

test('patch monitoring instance type fails on missing key', async ({ request }) => {
  const names = await createInstances(request, 'patch-monit-')
  const name = names[1]

  const response = await request.get(`/v1/monitoring-instances/${name}`)

  await checkError(response)

  const patchData = {
    type: 'pmm',
  }
  const updated = await request.patch(`/v1/monitoring-instances/${name}`, { data: patchData })

  expect(updated.status()).toBe(400)

  const getJson = await updated.json()

  expect(getJson.message).toMatch('Pmm key is required')
})

test('create monitoring instance failures', async ({ request }) => {
  const response = await request.post('/v1/monitoring-instances', { data: {} })
  expect(response.status()).toBe(400)
})

test('update monitoring instances failures', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${testPrefix}-fail`,
    url: 'http://monitoring',
    targetNamespaces: [testsNs],
    pmm: {
      apiKey: '123',
    },
  }
  const response = await request.post('/v1/monitoring-instances', { data })

  await checkError(response)
  const created = await response.json()

  const name = created.name

  const testCases = [
    {
      payload: { url: 'not-url' },
      errorText: '\'url\' is an invalid URL',
    },
    {
      payload: { pmm: { apiKey: '' } },
      errorText: 'Error at "/pmm/apiKey"',
    },
  ]

  for (const testCase of testCases) {
    const response = await request.patch(`/v1/monitoring-instances/${name}`, { data: testCase.payload })

    expect(response.status()).toBe(400)
    expect((await response.json()).message).toMatch(testCase.errorText)
  }
})

test('update: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent'
  const response = await request.patch(`/v1/monitoring-instances/${name}`, { data: { url: 'http://monitoring' } })

  expect(response.status()).toBe(404)
})

test('delete: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent'
  const response = await request.delete(`/v1/monitoring-instances/${name}`)

  expect(response.status()).toBe(404)
})

test('get: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent'
  const response = await request.get(`/v1/monitoring-instances/${name}`)

  expect(response.status()).toBe(404)
})

async function createInstances(request: APIRequestContext, namePrefix: string, count = 3): Promise<string[]> {
  const data = {
    type: 'pmm',
    name: '',
    url: 'http://monitoring-instance',
    targetNamespaces: [testsNs],
    pmm: {
      apiKey: '123',
    },
  }

  const res = []

  for (let i = 1; i <= count; i++) {
    data.name = `${namePrefix}${testPrefix}-${i}`
    res.push(data.name)
    const response = await request.post('/v1/monitoring-instances', { data })

    await checkError(response)
  }

  return res
}
