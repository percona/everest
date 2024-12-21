import { Page } from '@playwright/test';

export const MOCK_CLUSTER_NAME = 'cluster-1';
export const MOCK_BACKUP_NAME = 'backup-1';
export const MOCK_STORAGE_NAME = 'storage-1';
export const MOCK_SCHEDULE_NAME = 'schedule-1';

export const mockEngines = async (page: Page, namespace: string) =>
  page.route(`/v1/namespaces/${namespace}/database-engines`, async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            metadata: {
              name: 'percona-xtradb-cluster-operator',
              namespace: namespace,
            },
            spec: {
              type: 'pxc',
            },
            status: {
              status: 'installed',
              availableVersions: {
                engine: {
                  '8.0.36-28.1': {
                    status: 'available',
                  },
                },
              },
              pendingOperatorUpgrades: [
                {
                  targetVersion: '1.15.0',
                },
              ],
            },
          },
        ],
      },
    });
  });

export const mockClusters = (page: Page, namespace: string) =>
  page.route(`/v1/namespaces/${namespace}/database-clusters`, async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            metadata: {
              name: MOCK_CLUSTER_NAME,
              namespace,
            },
            spec: {
              engine: {
                type: 'pxc',
                storage: {
                  size: '1Gi',
                },
              },
            },
          },
        ],
      },
    });
  });

export const mockCluster = (page: Page, namespace: string) =>
  page.route(
    `/v1/namespaces/${namespace}/database-clusters/${MOCK_CLUSTER_NAME}`,
    async (route) => {
      await route.fulfill({
        json: {
          metadata: {
            name: MOCK_CLUSTER_NAME,
            namespace,
          },
          spec: {
            engine: {
              type: 'pxc',
              replicas: 1,
              resources: {
                cpu: '1',
                memory: '1G',
              },
              storage: {
                size: '1Gi',
              },
            },
            proxy: {
              replicas: 1,
              resources: {
                cpu: '200m',
                memory: '200M',
              },
            },
            backup: {
              enabled: true,
              schedules: [
                {
                  enabled: true,
                  schedule: '0 0 * * *',
                  backupStorageName: MOCK_STORAGE_NAME,
                  name: MOCK_SCHEDULE_NAME,
                },
              ],
            },
            monitoring: {},
          },
        },
      });
    }
  );

export const mockBackups = (page: Page, namespace: string) =>
  page.route(
    `/v1/namespaces/${namespace}/database-clusters/${MOCK_CLUSTER_NAME}/backups`,
    async (route) => {
      await route.fulfill({
        json: {
          items: [
            {
              metadata: {
                name: 'backup-1',
                namespace,
              },
              spec: {
                backupStorageName: MOCK_BACKUP_NAME,
                dbClusterName: MOCK_CLUSTER_NAME,
              },
              status: {
                created: '2024-12-20T00:54:18Z',
                completed: '2024-12-20T01:00:13Z',
                state: 'Succeeded',
              },
            },
          ],
        },
      });
    }
  );

export const mockStorages = (page: Page, namespace: string) =>
  page.route(`/v1/namespaces/${namespace}/backup-storages`, async (route) => {
    await route.fulfill({
      json: [
        {
          bucketName: 'bucket-1',
          name: MOCK_STORAGE_NAME,
          namespace,
          region: 'us-east-1',
          type: 's3',
          url: 's3://bucket-1',
        },
      ],
    });
  });
