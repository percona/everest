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
import { test, expect } from '@fixtures'
import {checkError, testsNs} from "@tests/tests/helpers";

// testPrefix is used to differentiate between several workers
// running this test to avoid conflicts in instance names
const testPrefix = `t${(Math.random() + 1).toString(36).substring(10)}`

test('get resource usage', async ({ request }) => {
  const r = await request.get(`/v1/resources`)
  const resources = await r.json()

  await checkError(r)

  expect(resources).toBeTruthy()

  expect(resources?.capacity).toBeTruthy()
  expect(resources?.available).toBeTruthy()
})

test('get cluster info', async ({ request }) => {
  const r = await request.get(`/v1/cluster-info`)
  const info = await r.json()

  await checkError(r)

  expect(info).toBeTruthy()

  expect(info?.clusterType).toBeTruthy()
  expect(info?.storageClassNames).toBeTruthy()
  expect(info?.storageClassNames).toHaveLength(1)
})
