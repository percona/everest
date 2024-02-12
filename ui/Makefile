EVEREST_OUT_DIR := ""

init:
	pnpm install

test:
	pnpm test

build:
	EVEREST_OUT_DIR=$(EVEREST_OUT_DIR) pnpm build

lint:
	pnpm lint

format:
	pnpm format

# This might change in the future if we have more apps, but for now keep it simple
dev:
	pnpm --filter "@percona/everest" dev