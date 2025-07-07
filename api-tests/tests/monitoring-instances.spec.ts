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
import { expect, test } from '@fixtures'
import { APIRequestContext } from '@playwright/test'
import {checkError, testPrefix, testsNs} from '@tests/tests/helpers';

const prefix = testPrefix()

test('create monitoring instance with api key', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${prefix}-key`,
    url: `http://${process.env.PMM1_IP}`,
    pmm: {
      apiKey: `${process.env.PMM1_API_KEY}`,
    },
  },

   response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

  await checkError(response)
  const created = await response.json()

  expect(created.name).toBe(data.name)
  expect(created.url).toBe(data.url)
  expect(created.type).toBe(data.type)
})

test('create monitoring instance with user/password', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${prefix}-pass`,
    url: `http://${process.env.PMM2_IP}`,
    pmm: {
      user: 'admin',
      password: 'admin',
    },
  },

   response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

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
  },

   response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

  expect(response.status()).toBe(400)
})

test('create monitoring instance missing pmm credentials', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: 'monitoring-fail',
    url: 'http://monitoring-instance',
    pmm: {},
  },

   response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

  expect(response.status()).toBe(400)
})

test('list monitoring instances', async ({ request }) => {
  const response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances`)

  await checkError(response)
  const list = await response.json()

  expect(list.filter((i) => i.name.startsWith(`${prefix}`)).length).toBe(2)
})

test('get monitoring instance', async ({ request }) => {
  const name = `${prefix}-key`
  let response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  await checkError(response)
  const i = await response.json()

  expect(i.name).toBe(name)
})

test('patch monitoring instance', async ({ request , page}) => {
  const name = `${prefix}-key`

  const response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  await checkError(response)
  const created = await response.json(),
      patchData = { url: `http://monitoring-service.default.svc.cluster.local` },// URL pointing to the same instance
   updated = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()

  expect(getJson.url).toBe(patchData.url)
  expect(getJson.apiKeySecretId).toBe(created.apiKeySecretId)
})

test('patch monitoring instance type fails on missing key', async ({ request, page }) => {
  const name = `${prefix}-key`

  let response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  await checkError(response)

  const patchData = {
    type: 'pmm',
  },
   updated = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: patchData })

  expect(updated.status()).toBe(400)

  const getJson = await updated.json()

  expect(getJson.message).toMatch('pmm key is required')
})

test('patch monitoring instance to existing with apiKey', async ({ request , page}) => {
  const name = `${prefix}-key`
  const response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  await checkError(response)
  const created = await response.json()
  const patchData = {
    url: 'http://monitoring-service.monitoring.svc.cluster.local', // existing other monitoring URL
    pmm: {
      apiKey: `${process.env.PMM1_API_KEY}`,
    },
  }
  const updated = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()

  expect(getJson.url).toBe(patchData.url)
  expect(getJson.apiKeySecretId).not.toBe(created.apiKeySecretId)
})

test('patch monitoring instance to existing with admin password', async ({ request , page}) => {
  const name = `${prefix}-key`
  const response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  await checkError(response)
  const created = await response.json()
  const patchData = {
    url: 'http://monitoring-service.monitoring.svc.cluster.local', // existing other monitoring URL
    pmm: {
      user: 'admin',
      password: 'admin'
    },
  }
  const updated = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: patchData })

  await checkError(updated)
  const getJson = await updated.json()

  expect(getJson.url).toBe(patchData.url)
  expect(getJson.apiKeySecretId).not.toBe(created.apiKeySecretId)
})

test('create monitoring instance failures', async ({ request }) => {
  const response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data: {} })

  expect(response.status()).toBe(400)
})

test('update monitoring instances failures', async ({ request }) => {
  const data = {
    type: 'pmm',
    name: `${testPrefix()}-fail`,
    url: `http://${process.env.PMM_IP}`,
    pmm: {
      apiKey: '123',
    },
  },
   response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

  await checkError(response)
  const created = await response.json(),

   name = created.name,

   testCases = [
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
    const response = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: testCase.payload })

    expect(response.status()).toBe(400)
    expect((await response.json()).message).toMatch(testCase.errorText)
  }
})

test('update: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent',
   response = await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, { data: { url: `http://${process.env.PMM_IP}` } })

  expect(response.status()).toBe(404)
})

test('delete: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent',
   response = await request.delete(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  expect(response.status()).toBe(404)
})

test('get: monitoring instance not found', async ({ request }) => {
  const name = 'non-existent',
   response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)

  expect(response.status()).toBe(404)
})

async function createInstances(request: APIRequestContext, names: string[]): Promise<string[]> {
  const data = {
    type: 'pmm',
    name: '',
    url: 'http://mcreateInstancesonitoring-instance',
    pmm: {
      apiKey: '123',
    },
  },

   res = []

  for (let i = 0; i < names.length; i++) {
    data.name = names[i]
    res.push(data.name)
    const response = await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data })

    await checkError(response)
  }

  return res
}

test('delete monitoring instance', async ({ request, page }) => {
    const name = `${prefix}-key`
    let response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances`)

    await checkError(response)
    let list = await response.json()

    expect(list.filter((i) => i.name.startsWith(`${prefix}`)).length).toBe(3)

    response = await request.delete(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)
    await checkError(response)

    // list of the monitoring-instances is not updated immediately, there is some kind of cache
    await page.waitForTimeout(1000)

    response = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances`)
    await checkError(response)
    list = await response.json()

    expect(list.filter((i) => i.name.startsWith(`${prefix}`)).length).toBe(1)
})

async function deleteInstances(request: APIRequestContext, prefix: string): Promise<string[]> {
  const result = await request.get(`/v1/namespaces/${testsNs}/monitoring-instances`),
   list = await result.json()

  for (const i of list) {
    if (!i.name.startsWith(prefix)) {
      continue
    }

    await request.delete(`/v1/namespaces/${testsNs}/monitoring-instances/${i.name}`)
  }
}

function genNames(prefix: string, count = 3): string[] {
  const res = []

  for (let i = 1; i <= count; i++) {
    res.push(`${prefix}-${i}`)
  }

  return res
}
