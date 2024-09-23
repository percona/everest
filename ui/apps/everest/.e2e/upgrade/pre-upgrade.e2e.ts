import { test } from "@playwright/test";
import { createDbClusterFn } from "../utils/db-cluster";
import {mongoDBCluster, postgresDBCluster, psDBCluster} from "./testData";

test.describe.configure({ retries: 0 });
test("Pre upgrade setup",{ tag: '@pre-upgrade' },
    async ({ request}) => {
    await createDbClusterFn(request, {
        dbName: psDBCluster.name,
        dbType: 'mysql',
        numberOfNodes: psDBCluster.numberOfNodes,
        cpu: psDBCluster.cpu,
        disk: psDBCluster.disk,
        memory: psDBCluster.memory,
        externalAccess: psDBCluster.externalAccess,
        sourceRanges: psDBCluster.sourceRanges,
    });

    await createDbClusterFn(request, {
        dbName: mongoDBCluster.name,
        dbType: 'mongodb',
        numberOfNodes: mongoDBCluster.numberOfNodes,
        cpu: mongoDBCluster.cpu,
        disk: mongoDBCluster.disk,
        memory: mongoDBCluster.disk,
        externalAccess: mongoDBCluster.externalAccess,
    });

    await createDbClusterFn(request, {
        dbName: postgresDBCluster.name,
        dbType: 'postgresql',
        numberOfNodes: postgresDBCluster.numberOfNodes,
        cpu: postgresDBCluster.cpu,
        disk: postgresDBCluster.disk,
        memory: postgresDBCluster.disk,
        externalAccess: postgresDBCluster.externalAccess,
    });
});
