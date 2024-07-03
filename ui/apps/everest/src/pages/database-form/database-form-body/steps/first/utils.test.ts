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

describe('Wizard first step::utils', () => {
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
