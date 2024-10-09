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

import { DbEngine, DbEngineType } from 'shared-types/dbEngines.types';
import { filterAvailableDbVersionsForDbEngineEdition } from './utils';

const generateDbEngineWithVersions = (
  versions: string[],
  type: DbEngineType
): DbEngine =>
  ({
    availableVersions: {
      engine: versions.map((version) => ({ version })),
    },
    type,
  }) as unknown as DbEngine;

describe('DBVersion Available filter test', () => {
  describe('filterAvailableDbVersionsForDbEngineEdition', () => {
    it('should rule out downgrades', () => {
      expect(
        filterAvailableDbVersionsForDbEngineEdition(
          generateDbEngineWithVersions(
            ['5.0.0', '4.0.0', '4.3.9', '4.4.1'],
            DbEngineType.PXC
          ),
          '4.4.0'
        ).map(({ version }) => version)
      ).toEqual(['5.0.0', '4.4.1']);
    });

    it('should coerce PG versions to semver', () => {
      expect(
        filterAvailableDbVersionsForDbEngineEdition(
          generateDbEngineWithVersions(
            ['13.0', '14.0', '14.1', '15.0'],
            DbEngineType.POSTGRESQL
          ),
          '14.1'
        ).map(({ version }) => version)
      ).toEqual(['14.1']);
    });

    it('should allow major upgrades for PXC', () => {
      expect(
        filterAvailableDbVersionsForDbEngineEdition(
          generateDbEngineWithVersions(
            ['5.0.0', '4.0.0', '4.3.9', '4.4.1'],
            DbEngineType.PXC
          ),
          '4.4.0'
        ).map(({ version }) => version)
      ).toEqual(['5.0.0', '4.4.1']);
    });

    it('should rule out major upgrades/downgrades for PSMDB/PG', () => {
      expect(
        filterAvailableDbVersionsForDbEngineEdition(
          generateDbEngineWithVersions(
            [
              '1.0.0',
              '1.2.0',
              '2.3.3',
              '2.5.0',
              '2.9.0',
              '3.1.0',
              '4.3.0',
              '5.4.1',
            ],
            DbEngineType.PSMDB
          ),
          '2.3.0'
        ).map(({ version }) => version)
      ).toEqual(['2.3.3', '2.5.0', '2.9.0']);
    });
  });
});
