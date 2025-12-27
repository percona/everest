import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const OLD_RBAC_FILE = 'old_rbac_permissions';
const RBAC_LOCK_FILE = join('/tmp', 'everest-rbac-lock');
const LOCK_TIMEOUT = 30000;

async function acquireRBACLock(): Promise<() => Promise<void>> {
  const startTime = Date.now();

  while (true) {
    try {
      // fails if file exists
      await fs.writeFile(RBAC_LOCK_FILE, process.pid.toString(), { flag: 'wx' });

      // Successfully acquired lock
      return async () => {
        try {
          await fs.unlink(RBAC_LOCK_FILE);
        } catch (e) {
          // Ignore errors during unlock
        }
      };
    } catch (error: any) {
      // Lock file exists, wait and retry
      if (Date.now() - startTime > LOCK_TIMEOUT) {
        // Force remove stale lock and try one more time
        try {
          await fs.unlink(RBAC_LOCK_FILE);
        } catch (e) {
          // Ignore
        }
        throw new Error('Failed to acquire RBAC lock after timeout');
      }

      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(100 + Math.random() * 100, 500);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

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

/**
 * Sets RBAC permissions for a specific role and assigns a user to that role.
 * This is the recommended approach for RBAC testing as it allows parallel test execution
 * with unique users and roles per test.
 * 
 * @param roleName - Unique role name (e.g., 'role:test-backups', 'role:admin')
 * @param permissions - Array of permission tuples [resource, action, object]
 * @param userName - Username to assign to the role (REQUIRED for new tests)
 * 
 * Note: When called, removes ALL existing role assignments for the user to ensure
 * the user has only one role at a time, preventing permission conflicts.
 */
export const setRBACRoleWithPermissionsK8s = async (
  roleName: string,
  permissions: [string, string, string][] = [],
  userName: string
) => {
  // Acquire lock to serialize ConfigMap modifications
  const releaseLock = await acquireRBACLock();

  try {
    const user = userName;

    // Validate permissions to prevent invalid policy syntax
    const validPermissions = permissions.filter(p => {
      return p.every(value => value && value !== 'undefined' && value.trim() !== '');
    });

    if (validPermissions.length !== permissions.length) {
      console.warn(`Warning: Some RBAC permissions for role ${roleName} were filtered out due to empty or undefined values`);
      console.warn('Original:', permissions);
      console.warn('Filtered:', validPermissions);
    }

    // Get current policy to preserve existing roles (like role:admin default permissions)
    const getCurrentPolicy = () => {
      try {
        const result = execSync(
          `kubectl get configmap/everest-rbac --namespace everest-system -o jsonpath='{.data.policy\\.csv}'`,
          { encoding: 'utf-8' }
        ).trim();
        return result ? result.split('\\n') : [];
      } catch {
        return [];
      }
    };

    const currentPolicy = getCurrentPolicy();

    // Filter out existing entries for the specified role and user assignment to ALL roles (ensure single role per user)
    const filteredPolicy = currentPolicy.filter(line => {
      const isRolePermission = line.startsWith(`p,${roleName},`);
      const isAnyUserAssignment = line.startsWith(`g,${user},`);
      return !isRolePermission && !isAnyUserAssignment;
    });

    // Build new policy lines for this role
    const newPolicyLines = [
      // Assign user to the specified role (and ONLY this role)
      `g,${user},${roleName}`,
      // Add permissions for the role
      ...validPermissions.map((p) => `p,${roleName},${p.join(',')}`),
    ];

    // Combine existing policy with new role policy
    const finalPolicy = [...filteredPolicy, ...newPolicyLines];

    // Create the patch object
    const patchData = {
      data: {
        enabled: 'true',
        'policy.csv': finalPolicy.join('\n')
      }
    };

    // Write patch data to a temporary file to avoid E2BIG error with large policies
    const tempFile = join(tmpdir(), `rbac-patch-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
    await fs.writeFile(tempFile, JSON.stringify(patchData), 'utf-8');

    try {
      const command = `kubectl patch configmap/everest-rbac --namespace everest-system --type merge --patch-file ${tempFile}`;
      execSync(command);
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // We need this to give time for the RBAC to be applied, or headless tests might fail for being too fast
    // Increased timeout for parallel tests to ensure permissions propagate even under load
    // Using longer delay locally since parallel tests create more contention
    await new Promise<void>((resolve) =>
      setTimeout(
        () => {
          resolve();
        },
        process.env.CI ? 5000 : 3000
      )
    );
  } finally {
    // Always release the lock
    await releaseLock();
  }
};

/**
 * Legacy function for giving admin permissions to the shared RBAC_USER.
 * 
 * @deprecated Only used by legacy PR tests. New tests should use:
 * setRBACRoleWithPermissionsK8s('role:admin', [], username)
 */
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
