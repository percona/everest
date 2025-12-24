import { CI_USER_STORAGE_STATE_FILE } from "@e2e/constants";

export const rbacProject = [
    {
        name: 'pr:rbac',
        testMatch: /.^/,
        dependencies: [
            'pr:rbac:backups',
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
];