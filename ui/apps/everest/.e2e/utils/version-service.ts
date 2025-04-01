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

import { APIRequestContext } from '@playwright/test';
import { everestFeatureBuildForUpgrade } from '@e2e/constants';
import { execSync } from 'child_process';

export const getVersionServiceURL = async () => {
    if (
      typeof everestFeatureBuildForUpgrade !== 'undefined' &&
      everestFeatureBuildForUpgrade
    ) {
      return 'http://localhost:8081';
    } else {
      try {
        const command = `kubectl get deployment everest-server --namespace everest-system -o jsonpath="{.spec.template.spec.containers[0].env[?(@.name=='VERSION_SERVICE_URL')].value}"`;
        const output = execSync(command).toString();
        return output;
      } catch (error) {
        console.error(`Error executing command: ${error}`);
        throw error;
      }
    }
};

export const getVersionServiceDBVersions = async (dbType: string, crVersion: string, request: APIRequestContext, majorVersion?: string): Promise<string[]> => {
    const versions: string[] = [];
    const vsKey = dbType === 'psmdb' ? 'mongod' : dbType;
    const dbOperatorName = dbType === 'postgresql' ? 'pg-operator' : dbType + '-operator';
    const versionServiceURL = await getVersionServiceURL();

    try {
        const response = await (
          await request.get(
            versionServiceURL +
              `/versions/v1/${dbOperatorName}/${crVersion}`
          )
        ).json();

        console.log(response);
        response.versions.forEach((versionEntry: any) => {
            const dbVersions = versionEntry.matrix?.[vsKey];
            if (dbVersions) {
                for (const [version] of Object.entries(dbVersions)) {
                    versions.push(version);
                }
            }
        });
        if (!Array.isArray(response?.versions)) return null;
    
        // Sort versions in descending order (latest first)
        versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    
        // Filter by major version if provided
        return majorVersion ? versions.filter(version => version.startsWith(majorVersion)) : versions;
      } catch (error) {
        console.error('Error extracting database version:', error);
        return null;
      }
};