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

import { APIRequestContext, expect } from '@playwright/test';

export const getClusterDetailedInfo = async (
  token: string,
  request: APIRequestContext
) => {
  const maxRetries = 3;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const clusterInfo = await request.get('/v1/cluster-info', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (clusterInfo.ok()) {
      return clusterInfo.json();
    } else {
      const status = clusterInfo.status();
      const body = await clusterInfo.text();
      console.warn(
        `Attempt ${attempt} failed with status ${status}: ${body}`
      );

      if (attempt < maxRetries) {
        await delay(1000); // wait 1 second before retrying
      } else {
        // Log the final failure before throwing
        throw new Error(
          `Failed to get cluster info after ${maxRetries} attempts. Status: ${status}, Response: ${body}`
        );
      }
    }
  }
};