import { execSync } from 'child_process';

const OLD_RBAC_FILE = 'old_rbac_permissions';

export const saveOldRBACPermissions = async () => {
  try {
    const command = `kubectl get configmap everest-rbac --namespace everest-system -o jsonpath="{.data}" > ${OLD_RBAC_FILE}`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const restoreOldRBACPermissions = async () => {
  try {
    const oldRbacFileContent = execSync(`cat ${OLD_RBAC_FILE}`).toString();
    console.log(`oldRbacFileContent: ${oldRbacFileContent}`);
    const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":${oldRbacFileContent}}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const setRBACPermissions = async (
  user: string,
  permissions: [string, string, string][] = []
) => {
  try {
    const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":{"enabled": "${permissions !== undefined}", "policy.csv":"g,${user},role:e2e-rbac-user\\n${permissions.map((p) => `p,role:e2e-rbac-user,${p.join(',')}`).join('\\n')}"}}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};
