# Percona Everest Frontend

This code base is a monorepo that holds a number of packages, namely:

- `@percona/utils` -> common shared utils code (e.g. `kebabize` string function);
- `@percona/types` -> common shared types;
- `@percona/design` -> Percona UI themes and related utils, from base to Everest;
- `@percona/ui-lib` -> common UI library;
- `@percona/eslint-config-react`, `@percona/prettier-config`, `@percona/tsconfig` -> packages for shared configurations of ESlint, Prettier and Typescript;
- `@percona/everest` -> The Percona Everest frontend code.

Percona Everest is an open source Database-as-a-Service solution that automates day-one and day-two operations for Postgres, MySQL, and MongoDB databases within Kubernetes clusters.

## Pre-Requisites

Make sure PNPM is installed: https://pnpm.io/installation

## Stack

This repo uses the following stack across its packages:

- PNPM to manage workspaces in the monorepo and dependencies (https://pnpm.io/);
- Typescript (https://www.typescriptlang.org/);
- React (https://react.dev/);
- Rollup to bundle the different common packages (https://rollupjs.org/);
- Vite for Everest development (https://vitejs.dev/);
- Vitest for unit tests (https://vitest.dev/);
- Playwright for E2E tests (https://playwright.dev/);
- Turborepo for orchestration across packages and caching (https://turbo.build/);

## Install dependencies

```bash
make init
```

## Run everest in development mode

```bash
make dev
```

## Using backup locations credentials locally for E2E tests

Please rename the `.env.test` to `.env` in `apps/everest/.e2e` folder and add the correct values for the backup location.

## Build packages for production

```bash
make build
```

By default, Everest build will be placed under `apps/everest/dist`. This can be changed using `EVEREST_OUT_DIR`:

```bash
make build EVEREST_OUT_DIR=my-dist
```

This path can either be relative to the repo root or absolute.

## Run a command for a particular workspace

```bash
pnpm --filter <workspace> <command>
```

More about PNPM filtering: https://pnpm.io/filtering

## Relevant repos:

- https://github.com/percona/percona-everest-backend
- https://github.com/percona/percona-everest-cli

        #a change to revert 4
