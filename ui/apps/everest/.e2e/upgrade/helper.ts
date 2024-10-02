import { request, test } from "@playwright/test";
import { everestTagForUpgrade } from "@e2e/constants";
import yaml from "yaml";
import process from "process";
import { mapper } from "@e2e/utils/mapper";
import { Operator, OperatorVersions } from "@e2e/upgrade/types";

const getOperatorShortName = mapper<Operator>({
    _default: 'unknown',
    [Operator.PXC]: 'pxc',
    [Operator.PSMDB]: 'psmdb',
    [Operator.PG]: 'postgresql',
});


export const getExpectedOperatorVersions = async () => {
    const allVersions: OperatorVersions[] = [];

    await test.step(`get new operator versions from the everest-catalog repository`, async () => {
        const operatorVersionsVariables = new Map();
        operatorVersionsVariables.set(Operator.PXC, 'PXC_OPERATOR_VERSION');
        operatorVersionsVariables.set(Operator.PSMDB, 'PSMDB_OPERATOR_VERSION');
        operatorVersionsVariables.set(Operator.PG, 'POSTGRESQL_OPERATOR_VERSION');

        for (const operator of Object.values(Operator)) {
            const apiRequest = await request.newContext();
            const yamlUrl = `https://raw.githubusercontent.com/percona/everest-catalog/${everestTagForUpgrade}/veneer/${operator}.yaml`;
            const response = await apiRequest.get(yamlUrl);
            const yamlContent = await response.text();
            const parsedYaml = yaml.parse(yamlContent);

            const fastBundlesImages = parsedYaml.Stable.Bundles.map(
                (bundle) => bundle.Image
            );

            const lastImageTag = fastBundlesImages[fastBundlesImages.length - 1];
            const versionMatch = lastImageTag.match(/:(?:v)?(\d+\.\d+\.\d+)/);
            const version = versionMatch ? versionMatch[1] : null;
            const oldVersion = process.env[operatorVersionsVariables.get(operator)];

            if (oldVersion !== version) {
                allVersions.push({
                    name: operator,
                    shortName: getOperatorShortName(operator),
                    version: `v${version}`,
                    oldVersion: `v${oldVersion}`,
                });
            }
        }
    });

    return allVersions;
};
