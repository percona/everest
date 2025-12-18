import { CI_USER_STORAGE_STATE_FILE } from "@e2e/constants";

export const dbClusterName = 'pr-rstr-act';

export const dbRestoreActionProject = [
    {
        name: 'pr:db-restore:db-restore-action:setup',
        testDir: './pr/db-restore',
        testMatch: /db-restore-action\.setup\.ts/,
        dependencies: ['global:auth:ci:setup'],
        teardown: 'pr:db-restore:db-restore-action:teardown',
        use: {
            storageState: CI_USER_STORAGE_STATE_FILE,
        },
    },
    {
        name: 'pr:db-restore:db-restore-action:teardown',
        testDir: './pr/db-restore',
        testMatch: /db-restore-action\.teardown\.ts/,
    },
    {
        name: 'pr:db-restore:db-restore-action',
        testDir: './pr/db-restore',
        testMatch: /db-cluster-restore-action\.e2e\.ts/,
        dependencies: ['pr:db-restore:db-restore-action:setup'],
        use: {
            storageState: CI_USER_STORAGE_STATE_FILE,
        },
    },
];