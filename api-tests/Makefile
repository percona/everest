init:               ## Install dependencies
	npm ci
	PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npx playwright install

test:               ## Run all tests
	npx playwright test tests/pg-clusters.spec.ts --config=playwright.config.ts

test-api-pxc:       ## Run tests with @pxc tag
	npx playwright test --config=playwright.config.ts -g '@pxc'

lint:               ## Run linter typescript checks
	npm run lint:ts && npm run typecheck && echo 'Lint OK'

lint-fix:           ## Fix linter errors where possible
	npx eslint --fix .
