import { DbEngineType } from 'shared-types/dbEngines.types';
import { changeAvailableDbVersionsForDbEngine } from './utils';

describe('Wizard first step::utils', () => {
  describe('changeAvailableDbVersionsForDbEngine', () => {
    it('should rule out downgrades', () => {
      expect(
        changeAvailableDbVersionsForDbEngine(
          {
            availableVersions: {
              engine: [
                { version: '5.0.0' },
                { version: '4.0.0' },
                { version: '4.3.9' },
                { version: '4.4.1' },
              ],
            },
            type: DbEngineType.PXC,
          },
          '4.4.0'
        )
      ).toEqual([{ version: '5.0.0' }, { version: '4.4.1' }]);
    });

    it('should coerce PG versions to semver', () => {
      expect(
        changeAvailableDbVersionsForDbEngine(
          {
            availableVersions: {
              engine: [
                { version: '13.0' },
                { version: '14.0' },
                { version: '14.1' },
                { version: '15.0' },
              ],
            },
            type: DbEngineType.POSTGRESQL,
          },
          '14.1'
        )
      ).toEqual([{ version: '14.1' }]);
    });

    it('should allow major upgrades for PXC', () => {
      expect(
        changeAvailableDbVersionsForDbEngine(
          {
            availableVersions: {
              engine: [
                { version: '5.0.0' },
                { version: '4.0.0' },
                { version: '4.3.9' },
                { version: '4.4.1' },
              ],
            },
            type: DbEngineType.PXC,
          },
          '4.4.0'
        )
      ).toEqual([{ version: '5.0.0' }, { version: '4.4.1' }]);
    });

    it('should rule out major upgrades/downgrades for PSMDB/PG', () => {
      expect(
        changeAvailableDbVersionsForDbEngine(
          {
            availableVersions: {
              engine: [
                { version: '1.0.0' },
                { version: '1.2.0' },
                { version: '2.3.3' },
                { version: '2.5.0' },
                { version: '2.9.0' },
                { version: '3.1.0' },
                { version: '4.3.0' },
                { version: '5.4.1' },
              ],
            },
            type: DbEngineType.PSMDB,
          },
          '2.3.0'
        )
      ).toEqual([
        { version: '2.3.3' },
        { version: '2.5.0' },
        { version: '2.9.0' },
      ]);
    });
  });
});
