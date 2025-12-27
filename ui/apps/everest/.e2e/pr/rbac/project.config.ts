import { CI_USER_STORAGE_STATE_FILE } from "@e2e/constants";

export const rbacProject = [
    {
        name: 'pr:rbac',
        testMatch: /.^/,
        dependencies: [
            'pr:rbac:backups',
            'pr:rbac:clusters',
            'pr:rbac:namespaces',
        ],
    },
    {
        name: 'pr:rbac:backups',
        testDir: './pr/rbac',
        testMatch: /backups\.e2e\.ts/,
        dependencies: ['global:auth:ci:setup'],
        use: {
            storageState: CI_USER_STORAGE_STATE_FILE,
        },
    },
    {
        name: 'pr:rbac:clusters',
        testDir: './pr/rbac',
        testMatch: /clusters\.e2e\.ts/,
        dependencies: ['global:auth:ci:setup'],
        use: {
            storageState: CI_USER_STORAGE_STATE_FILE,
        },
    },
    {
        name: 'pr:rbac:namespaces',
        testDir: './pr/rbac',
        testMatch: /namespaces\.e2e\.ts/,
        dependencies: ['global:auth:ci:setup'],
        use: {
            storageState: CI_USER_STORAGE_STATE_FILE,
        },
    },
];