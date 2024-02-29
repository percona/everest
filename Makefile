FILES = $(shell find . -type f -name '*.go')

RELEASE_VERSION ?= v0.0.0-$(shell git rev-parse --short HEAD)
RELEASE_FULLCOMMIT ?= $(shell git rev-parse HEAD)

FLAGS = -X 'github.com/percona/everest/pkg/version.Version=$(RELEASE_VERSION)' \
	-X 'github.com/percona/everest/pkg/version.FullCommit=$(RELEASE_FULLCOMMIT)' \

LD_FLAGS_API = -ldflags " $(FLAGS) -X 'github.com/percona/everest/pkg/version.ProjectName=Everest API Server'"
LD_FLAGS_CLI = -ldflags " $(FLAGS) -X 'github.com/percona/everest/pkg/version.ProjectName=everestctl'"

default: help

help:                   ## Display this help message
	@echo "Please use \`make <target>\` where <target> is one of:"
	@grep '^[a-zA-Z]' $(MAKEFILE_LIST) | \
		awk -F ':.*?## ' 'NF==2 {printf "  %-26s%s\n", $$1, $$2}'

init:                   ## Install development tools
	cd tools && go generate -x -tags=tools

build:                ## Build binaries
	go build -v $(LD_FLAGS_API) -o bin/everest ./cmd

build-cli:                ## Build binaries
	go build -v $(LD_FLAGS_CLI) -o bin/everestctl ./cmd/everest

release: FLAGS += -X 'github.com/percona/everest/cmd/config.TelemetryURL=https://check.percona.com' -X 'github.com/percona/everest/cmd/config.TelemetryInterval=24h'

release: build  ## Build release version


build-debug:                ## Build binaries
	go build -tags debug -v $(LD_FLAGS_API) -o bin/everest ./cmd

gen:                    ## Generate code
	go generate ./...
	make format

format:                 ## Format source code
	bin/gofumpt -l -w $(FILES)
	bin/goimports -local github.com/percona/everest -l -w $(FILES)
	bin/gci write --section Standard --section Default --section "Prefix(github.com/percona/everest)" $(FILES)

check:                  ## Run checks/linters for the whole project
	bin/go-consistent -pedantic ./...
	LOG_LEVEL=error bin/golangci-lint run

test:                   ## Run tests
	go test -race -timeout=10m ./...

test-cover:             ## Run tests and collect per-package coverage information
	go test -race -timeout=10m -count=1 -coverprofile=cover.out -covermode=atomic ./...

test-crosscover:        ## Run tests and collect cross-package coverage information
	go test -race -timeout=10m -count=1 -coverprofile=crosscover.out -covermode=atomic -p=1 -coverpkg=./... ./...

run: build            ## Run binary
	bin/everest

run-debug: build-debug    ## Run binary
	TELEMETRY_URL=https://check-dev.percona.com \
	TELEMETRY_INTERVAL=30m \
	bin/everest

cert:                   ## Install dev TLS certificates
	mkcert -install
	mkcert -cert-file=dev-cert.pem -key-file=dev-key.pem everest everest.localhost 127.0.0.1

k8s: 					## Create a local minikube cluster
	minikube start --nodes=3 --cpus=4 --memory=4g --apiserver-names host.docker.internal

k8s-macos: k8s          ## Create a local minikube cluster with MacOS specific configuration
	minikube addons disable storage-provisioner
	kubectl delete storageclass standard
	kubectl apply -f ./dev/kubevirt-hostpath-provisioner.yaml
