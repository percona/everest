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

/**
 * Retrieves the URL for the version service based on the current environment.
 *
 * If the `everestFeatureBuildForUpgrade` global variable is defined and set to `true`,
 * it returns a hardcoded local URL (`http://localhost:8081`). Otherwise, it attempts
 * to fetch the URL from the `VERSION_SERVICE_URL` environment variable of the
 * `everest-server` deployment in the `everest-system` namespace using a `kubectl` command.
 *
 * @returns {Promise<string>} A promise that resolves to the version service URL.
 * @throws Will throw an error if the `kubectl` command fails to execute.
 */
export const getVersionServiceURL = async (): Promise<string> => {
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

/**
 * Retrieves a list of database versions from the version service based on the provided database type,
 * custom resource (CR) version, and optionally filters by a major version.
 *
 * @param dbType - The type of the database (e.g., 'psmdb', 'postgresql').
 * @param crVersion - The custom resource version to query the version service for.
 * @param request - The API request context used to make HTTP requests.
 * @param majorVersion - (Optional) A specific major version to filter the results by.
 * @returns A promise that resolves to an array of database versions in descending order (latest first),
 *          or `null` if an error occurs or the response is invalid.
 *
 * @throws Will log an error to the console if the request fails or the response is malformed.
 */
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