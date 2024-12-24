import { execSync } from 'child_process';

const OLD_RBAC_FILE = 'old_rbac_permissions';

export const saveOldRBACPermissions = async () => {
  const command = `kubectl get configmap everest-rbac --namespace everest-system -o jsonpath="{.data}" > ${OLD_RBAC_FILE}`;
  execSync(command);
};

export const restoreOldRBACPermissions = async () => {
  const oldRbacFileContent = execSync(`cat ${OLD_RBAC_FILE}`).toString();
  const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":${oldRbacFileContent}}'`;
  execSync(command);
};

export const setRBACPermissionsK8S = async (
  user: string,
  permissions: [string, string, string][] = []
) => {
  try {
    const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":{"enabled": "${permissions !== undefined}", "policy.csv":"g,${user},role:e2e-rbac-user\\n${permissions.map((p) => `p,role:e2e-rbac-user,${p.join(',')}`).join('\\n')}"}}'`;
    execSync(command);

    // We need this to give time for the RBAC to be applied, or headless tests might fail for being too fast
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve();
      }, 500)
    );
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};
