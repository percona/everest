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

test('create/update/delete loadbalancerconfig instance', async ({ request, page }) => {
  await test.step('create lbc', async () => {
    const name = `${prefix}-first`
    const data = {
      metadata: {
        name: name
      },
      spec: {
        annotations: {
          "prefix.com/valid-annotation": "some-value",
          "prefix.com/another-valid-annotation123": "another-value",
        }
      },
    }
    let response = await request.post(`/v1/load-balancer-configs`, { data })

    await checkError(response)
    const created = await response.json()

    expect(created.metadata.name).toBe(data.metadata.name)
  })

  await test.step('create another lbc', async () => {
    const name = `${prefix}-second`
    const data = {
      metadata: {
        name: name
      },
      spec: {
        annotations: {
          "no-prefix-annotation": "some-value1",
          "another-no-prefix-annotation123": "another-value2",
        }
      },
    }

    let response = await request.post(`/v1/load-balancer-configs`, { data })

    await checkError(response)
    const created = await response.json()

    expect(created.metadata.name).toBe(data.metadata.name)
  })

  await test.step('list lbcs', async () => {
    const response = await request.get(`/v1/load-balancer-configs`)

    await checkError(response)
    const list = await response.json()

    expect(list.items.filter((i) => i.metadata.name.startsWith(`${prefix}`)).length).toBe(2)
  })

  await test.step('get lbc', async () => {
    const name = `${prefix}-first`
    let response = await request.get(`/v1/load-balancer-configs/${name}`)

    await checkError(response)
    const i = await response.json()

    expect(i.metadata.name).toBe(name)
  })

  await test.step('update lbc', async () => {
    const name = `${prefix}-first`

    const response = await request.get(`/v1/load-balancer-configs/${name}`)

    await checkError(response)
    let lbc = await response.json()
    lbc.spec.annotations = {"new-key": "newValue"}
    let updated = await request.put(`/v1/load-balancer-configs/${name}`, { data: lbc })

    await checkError(updated)
    const getJson = await updated.json()

    expect(getJson.metadata.name).toBe(lbc.metadata.name)
    expect(getJson.spec.annotations).toMatchObject(lbc.spec.annotations)
  })

  await test.step('update lbc failure', async () => {
    const name = `${prefix}-first`

    const response = await request.get(`/v1/load-balancer-configs/${name}`)

    await checkError(response)
    let lbc = await response.json()
    lbc.spec.annotations = {"-invalidkey": "newValue"}
    let updated = await request.put(`/v1/load-balancer-configs/${name}`, { data: lbc })

    expect(updated.ok()).toBeFalsy()
    expect((await updated.json()).message).toContain("invalid annotation key")
  })


  await test.step('delete lbc', async () => {
    const name = `${prefix}-first`
    let response = await request.get(`/v1/load-balancer-configs`)

    await checkError(response)
    let list = await response.json()

    expect(list.items.filter((i) => i.metadata.name.startsWith(`${prefix}`)).length).toBe(2)

    response = await request.delete(`/v1/load-balancer-configs/${name}`)
    await checkError(response)

    // list of the lbc is not updated immediately, there is some kind of cache
    await page.waitForTimeout(1000)

    response = await request.get(`/v1/load-balancer-configs`)
    await checkError(response)
    list = await response.json()

    expect(list.items.filter((i) => i.metadata.name.startsWith(`${prefix}`)).length).toBe(1)
  })
})
