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

  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, 1000)
  );
};

export const setRBACPermissionsK8S = async (
  permissions: [string, string, string][] = []
) => {
  // Validate permissions to prevent invalid policy syntax
  const validPermissions = permissions.filter(p => {
    return p.every(value => value && value !== 'undefined' && value.trim() !== '');
  });

  if (validPermissions.length !== permissions.length) {
    console.warn('Warning: Some RBAC permissions were filtered out due to empty or undefined values');
    console.warn('Original:', permissions);
    console.warn('Filtered:', validPermissions);
  }

  //TODO remove it's just for debugging
  // Build policy with admin role permissions and e2e-rbac-user permissions
  // Admin user gets full permissions on all resources
  const policyLines = [
    // Assign users to roles
    // `g,${process.env.CI_USER},role:admin`,
    // `g,${process.env.RBAC_USER},role:e2e-rbac-user`,
    // Admin role gets all permissions on all resources
    // `p,role:admin,namespaces,*,*`,
    // `p,role:admin,database-engines,*,*/*`,
    // `p,role:admin,database-clusters,*,*/*`,
    // `p,role:admin,database-cluster-backups,*,*/*`,
    // `p,role:admin,database-cluster-restores,*,*/*`,
    // `p,role:admin,database-cluster-credentials,*,*/*`,
    // `p,role:admin,backup-storages,*,*/*`,
    // `p,role:admin,monitoring-instances,*,*/*`,
    // `p,role:admin,settings,*,*`,
    // E2E test permissions
    ...validPermissions.map((p) => `p,role:e2e-rbac-user,${p.join(',')}`),
  ];

  const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":{"enabled": "${permissions !== undefined}", "policy.csv":"${policyLines.join('\\n')}"}}'`;
  execSync(command);

  // We need this to give time for the RBAC to be applied, or headless tests might fail for being too fast
  return new Promise<void>((resolve) =>
    setTimeout(
      () => {
        resolve();
      },
      process.env.CI ? 3000 : 500
    )
  );
};

export const giveUserAdminPermissions = async () => {
  execSync(
    `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":{"enabled": "true", "policy.csv":"g,${process.env.RBAC_USER},role:admin"}}'`
  );

  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, 5000)
  );
};
