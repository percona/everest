# E2E tests

## How UI E2E works

### Technology stack

- **Playwright** - E2E testing framework
- **TypeScript** - Programming language
- **Node.js v20.19.6** - Runtime environment
- **Kubernetes (k3d)** - Local cluster for testing
- **kubectl** - Kubernetes CLI for cluster management
- **everestctl** - Everest CLI for user/account management

### Project Structure

```
.e2e/
├── constants.ts           # Shared constants (timeouts, paths, etc.)
├── playwright.config.ts   # Main Playwright configuration
├── fixtures.ts           # Test fixtures
├── setup/                # Setup scripts run before tests
│   ├── auth.setup.ts     # CI user authentication
│   └── session.setup.ts  # Session user creation
├── teardown/             # Cleanup scripts run after tests
│   └── session.teardown.ts
├── pr/                   # PR-level tests
│   ├── rbac/            # RBAC permission tests
│   │   ├── backups.e2e.ts
│   │   ├── project.config.ts
│   │   └── utils.ts
│   ├── db-cluster/      # Database cluster tests
│   └── ...
├── release/              # Release-level tests
│   └── rbac/            # RBAC tests for releases
├── utils/                # Shared utilities
│   ├── user.ts          # User login/logout functions
│   ├── rbac-cmd-line.ts # RBAC permission management
│   ├── rbac-test-user.ts # RBAC test user creation
│   ├── namespaces.ts    # Namespace utilities
│   └── ...
└── generated/           # Auto-generated files
```

### Main concepts

#### Parallelization

- Tests run in parallel by default for faster execution
- Each test is isolated with its own browser context
- RBAC tests use unique users per test for true parallel execution

#### Utils

- **User Management**: `login()`, `logout()`, `loginTestUser()`, `createRBACTestUser()`
- **RBAC Management**: `setRBACRoleWithPermissionsK8s()` for dynamic permission configuration
- **Namespace Utils**: `getNamespacesFn()` for fetching available namespaces

#### Setup

- **global:auth:ci:setup** - Authenticates CI user (admin) and saves session
- **global:session:setup** - Creates session user for multi-user tests
- Tests declare dependencies on setup tasks in their project config

## Running in CI

CI runs all tests in parallel with the following steps:

1. **Build & Deploy**: `make deploy-all` builds Everest and deploys to k3d cluster
2. **Initialize**: `make ci-init` sets up test environment (MinIO, PMM, namespaces)
3. **Run Tests**: `make test` executes all Playwright tests
4. **Teardown**: Cleanup scripts delete temporary users and resources

Environment variables required:

- `CI_USER` / `CI_PASSWORD` - Admin user credentials
- `SESSION_USER` / `SESSION_PASS` - Secondary user credentials for multi-user tests
- `MONITORING_URL` / `MONITORING_USER` / `MONITORING_PASSWORD` - PMM credentials
- `EVEREST_LOCATION_*` - Backup storage credentials

**Note**: `RBAC_USER` / `RBAC_PASSWORD` are only needed for legacy PR RBAC tests (storages, policies, schedules). The newer RBAC tests (backups, all release tests) create unique users dynamically.

## Running tests locally

### Preparing environment

In root everest folder:

```sh
make k3d-cluster-up
make deploy-all
```

In `everest/ui/apps/everest/.e2e`:

```sh
make ci-init
```

**Note**: If you get "port 8080 already in use" error, run:

```sh
make k3d-cluster-down
make k3d-cluster-up
make deploy-all
```

### Tests Running

All tests:

```sh
make test
```

All tests in PR folder:

```sh
make test PROJECT=pr
```

Specific project (e.g., RBAC tests):

```sh
make test PROJECT=pr:rbac
```

Specific test file in PR=>db-cluster=>db-cluster-overview:

```sh
npx playwright test pr/db-cluster/db-cluster-overview/*.e2e.ts
```

Run with UI mode (debugging):

```sh
npx playwright test --ui
```

Run specific test by name:

```sh
npx playwright test -g "Hide Backups"
```

## RBAC Testing

RBAC tests verify permission enforcement for different user roles.

### Architecture

- Each test creates a **unique temporary user** (e.g., `rbac_hide_backups_1735123456789`)
- Each test creates an **isolated browser context** to prevent session/cookie conflicts during parallel execution
- Assigns user to a **unique role** with specific permissions
- Runs test to verify UI reflects those permissions
- Cleans up user and closes context after test completes

### Key Features

- **Parallel Execution**: Tests run in parallel using `test.describe.parallel()` with isolated browser contexts
- **Session Isolation**: Each test's browser context has its own cookies/localStorage to prevent interference
- **Unique Users**: Dynamic user creation (`rbac_testname_timestamp`) ensures no conflicts
- **RBAC Lock**: File-based locking serializes RBAC ConfigMap updates to prevent race conditions
- **Retry Logic**: Built-in retry for user creation (5 attempts) and login (3 attempts) handles transient failures

### Example Test Flow

```typescript
test('Hide Backups', async ({ browser }) => {
  // Create isolated context for this test to avoid session conflicts
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Create unique test user
  const testUser = await createRBACTestUser('hide-backups');

  try {
    // 2. Set RBAC permissions for this user's role
    await setRBACRoleWithPermissionsK8s(
      'role:test-hide-backups',
      [
        ['namespaces', 'read', namespace],
        ['database-clusters', '*', `${namespace}/*`],
      ],
      testUser.username
    );

    // 3. Login as test user
    await loginTestUser(page, testUser.username, testUser.password);

    // 4. Run test assertions
    await page.goto(`/databases/${namespace}/cluster/backups`);
    expect(await rows.count()).toBe(0); // Backups hidden
  } finally {
    // 5. Cleanup
    await logoutTestUser(page);
    await testUser.cleanup();
    await context.close();
  }
});
```

### RBAC Utilities

**Check current RBAC policy:**

```sh
kubectl get configmap/everest-rbac -n everest-system -o jsonpath='{.data.policy\.csv}'
```

**View users and their roles:**

```sh
kubectl get configmap/everest-rbac -n everest-system -o jsonpath='{.data.policy\.csv}' | grep "^g,"
```

**View permissions for a role:**

```sh
kubectl get configmap/everest-rbac -n everest-system -o jsonpath='{.data.policy\.csv}' | grep "^p,role:admin,"
```

**List all users:**

```sh
kubectl get configmap/everest-rbac -n everest-system -o jsonpath='{.data.policy\.csv}' | grep "^g," | cut -d',' -f2 | sort -u
```

## Troubleshooting

### Port 8080 already in use

```sh
# Stop k3d cluster completely
make k3d-cluster-down

# Start fresh
make k3d-cluster-up
make deploy-all
```

### Tests fail with "missing or malformed jwt"

This is expected when testing the API directly. The E2E tests handle authentication properly.

### RBAC tests failing

1. Verify admin user has permissions:
   ```sh
   kubectl get configmap/everest-rbac -n everest-system -o jsonpath='{.data.policy\.csv}' | grep "admin"
   ```
2. Check if `everestctl` is built:
   ```sh
   ls -la /path/to/everest-fork/bin/everestctl
   ```
3. Check for stale RBAC lock files:
   ```sh
   rm -f /tmp/.rbac-lock.lock
   ```
4. Verify tests use isolated browser contexts (should use `{ browser }` fixture, not `{ page }`)

### Clean up test users

Test users are automatically deleted, but to manually clean up:

```sh
bin/everestctl accounts list
bin/everestctl accounts delete -u rbac-test-user-123456789
```
