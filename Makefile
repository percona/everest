FILES = $(shell find . -type f -name '*.go')

RELEASE_VERSION ?= v1.8.0-rc1
RELEASE_FULLCOMMIT ?= $(shell git rev-parse HEAD)

FLAGS = -X 'github.com/percona/everest/pkg/version.Version=$(RELEASE_VERSION)' \
	-X 'github.com/percona/everest/pkg/version.FullCommit=$(RELEASE_FULLCOMMIT)' \

LD_FLAGS_API = -ldflags " $(FLAGS) -X 'github.com/percona/everest/pkg/version.ProjectName=Everest API Server'"
LD_FLAGS_CLI = -ldflags " $(FLAGS) -X 'github.com/percona/everest/pkg/version.ProjectName=everestctl'"
LD_FLAGS_CLI_TEST = -ldflags " $(FLAGS) -X 'github.com/percona/everest/pkg/version.ProjectName=everestctl' \
										-X 'github.com/percona/everest/pkg/version.EverestChannelOverride=fast-v0'"
.PHONY: default
default: help

.PHONY: help
help:                   ## Display this help message
	@echo "Please use \`make <target>\` where <target> is one of:"
	@grep '^[a-zA-Z]' $(MAKEFILE_LIST) | \
		awk -F ':.*?## ' 'NF==2 {printf "  %-26s%s\n", $$1, $$2}'

.PHONY: init
init:                   ## Install development tools
	cd tools && go generate -x -tags=tools

.PHONY: build
build:                ## Build binaries
	go build -v $(LD_FLAGS_API) -o bin/everest ./cmd

.PHONY: build-cli
build-cli: init charts                ## Build binaries
	go build -tags debug -v $(LD_FLAGS_CLI_TEST) -o bin/everestctl ./cmd/cli

.PHONY: release
release: FLAGS += -X 'github.com/percona/everest/cmd/config.TelemetryURL=https://check.percona.com' -X 'github.com/percona/everest/cmd/config.TelemetryInterval=24h'

release: build  ## Build release version

.PHONY: rc
rc: FLAGS += -X 'github.com/percona/everest/cmd/config.TelemetryURL=https://check-dev.percona.com' -X 'github.com/percona/everest/cmd/config.TelemetryInterval=24h'

rc: build  ## Build RC version

.PHONY: release-cli
release-cli:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -v $(LD_FLAGS_CLI) -o ./dist/everestctl-linux-amd64 ./cmd/cli
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -v $(LD_FLAGS_CLI) -o ./dist/everestctl-linux-arm64 ./cmd/cli
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -v $(LD_FLAGS_CLI) -o ./dist/everestctl-darwin-amd64 ./cmd/cli
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -v $(LD_FLAGS_CLI) -o ./dist/everestctl-darwin-arm64 ./cmd/cli
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -v $(LD_FLAGS_CLI) -o ./dist/everestctl.exe ./cmd/cli

.PHONY: build-debug
build-debug:                ## Build binaries
	CGO_ENABLED=0 go build -tags debug -v $(LD_FLAGS_API) -gcflags=all="-N -l" -o bin/everest ./cmd

.PHONY: gen
gen:                    ## Generate code
	go generate ./...
	$(MAKE) format

.PHONY: format
format:                 ## Format source code
	bin/gofumpt -l -w $(FILES)
	bin/goimports -local github.com/percona/everest -l -w $(FILES)
	bin/gci write --section Standard --section Default --section "Prefix(github.com/percona/everest)" $(FILES)

.PHONY: check
check:                  ## Run checks/linters for the whole project
	bin/go-consistent -pedantic ./...
	LOG_LEVEL=error bin/golangci-lint run

.PHONY: test
test:                   ## Run tests
	go test -race -timeout=10m ./...

.PHONY: test-cover
test-cover:             ## Run tests and collect per-package coverage information
	go test -race -timeout=10m -count=1 -coverprofile=cover.out -covermode=atomic ./...

.PHONY: test-crosscover
test-crosscover:        ## Run tests and collect cross-package coverage information
	go test -race -timeout=10m -count=1 -coverprofile=crosscover.out -covermode=atomic -p=1 -coverpkg=./... ./...

.PHONY: run
run: build            ## Run binary
	bin/everest

.PHONY: run-debug
run-debug: build-debug    ## Run binary
	TELEMETRY_URL=https://check-dev.percona.com \
	TELEMETRY_INTERVAL=30m \
	bin/everest

.PHONY: run-cli-install
run-cli-install: build-cli
	bin/everestctl install --disable-telemetry --skip-wizard --namespaces=everest

.PHONY: cert
cert:                   ## Install dev TLS certificates
	mkcert -install
	mkcert -cert-file=dev-cert.pem -key-file=dev-key.pem everest everest.localhost 127.0.0.1

.PHONY: k8s
k8s: 					## Create a local minikube cluster
	minikube start --nodes=3 --cpus=4 --memory=4g --apiserver-names host.docker.internal

.PHONY: k8s-macos
k8s-macos: k8s          ## Create a local minikube cluster with MacOS specific configuration
	minikube addons disable storage-provisioner
	kubectl delete storageclass standard
	kubectl apply -f ./dev/kubevirt-hostpath-provisioner.yaml

HELM := bin/helm
.PHONY: charts
charts: $(HELM)         ## Install Helm charts
	$(HELM) repo add prometheus-community https://prometheus-community.github.io/helm-charts
	$(HELM) repo add percona https://percona.github.io/percona-helm-charts/
	$(HELM) repo add vm https://victoriametrics.github.io/helm-charts
	$(HELM) repo update

CHART_BRANCH ?= main
.PHONY: update-dev-chart
update-dev-chart:
	GOPROXY=direct go get -u -v github.com/percona/percona-helm-charts/charts/everest@${CHART_BRANCH}
	go mod tidy

EVEREST_OPERATOR_BRANCH ?= main
.PHONY: update-dev-everest-operator
update-dev-everest-operator:
	GOPROXY=direct go get -u -v github.com/percona/everest-operator@${EVEREST_OPERATOR_BRANCH}
	go mod tidy

.PHONY: prepare-pr
prepare-pr: init
	$(MAKE) gen
	CHART_BRANCH=${CHART_BRANCH} $(MAKE) update-dev-chart
	EVEREST_OPERATOR_BRANCH=${EVEREST_OPERATOR_BRANCH} $(MAKE) update-dev-everest-operator
