import { PlaywrightTestProject } from "@playwright/test";
import { dbRestoreActionProject } from "./db-restore-action/project.config";

export const dbRestoreProject: PlaywrightTestProject[] = [
    {
        name: 'pr:db-restore',
        testMatch: /.^/,
        dependencies: [
            'pr:db-restore:db-restore-action',
            // 'pr:db-restore:db-restore-to-new-cluster',
        ],
    },
    ...dbRestoreActionProject
];