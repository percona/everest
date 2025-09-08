##@ General
.PHONY: default
default: help

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Environment preparation

.PHONY: init
init:     ## Install tests dependencies.
	$(info Installing dependencies)
	npm ci
	PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npx playwright install

CI_INIT_DEPS := init deploy-monitoring create-test-users
CI_INIT_DEPS += k3d-upload-pg-images port-forward-monitoring
.PHONY: ci-init
ci-init: $(CI_INIT_DEPS) 	## Prepare environment for running tests.

PMM_HELM_CHART_VER=1.3.21
HELM=go tool -modfile=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../go.mod helm
.PHONY: deploy-monitoring
deploy-monitoring:     ## Deploy monitoring instances to K3D test cluster.
	$(info Deploying PMM instances to K3D test cluster)
	$(HELM) repo add percona https://percona.github.io/percona-helm-charts/
	$(HELM) install pmm1 --set secret.pmm_password='admin',service.type=ClusterIP percona/pmm --version $(PMM_HELM_CHART_VER) --timeout 2m --wait
	$(HELM) install pmm2 --set secret.pmm_password='admin',service.type=ClusterIP percona/pmm --version $(PMM_HELM_CHART_VER) --timeout 2m -n everest-monitoring --wait

.PHONY: port-forward-monitoring
port-forward-monitoring:
	$(info Port-forwarding PMM instances to localhost)
	kubectl port-forward --namespace default svc/monitoring-service 8090:443 &
	kubectl port-forward --namespace everest-monitoring  svc/monitoring-service 8091:443 &

EVERESTCTL=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../bin/everestctl
.PHONY: create-test-users
create-test-users: ## Create test users and add everest_ci user to admin role.
	$(info Creating test users in Everest)
	$(EVERESTCTL) accounts create -u test -p password
	$(EVERESTCTL) accounts create -u everest_ci -p password
	kubectl patch configmap everest-rbac -n everest-system --patch "$$(kubectl get configmap everest-rbac -n everest-system -o json | jq '.data["policy.csv"] += "\ng, everest_ci, role:admin"' | jq '{data: { "policy.csv": .data["policy.csv"] } }')"
	kubectl get configmap everest-rbac -n everest-system -ojsonpath='{.data.policy\.csv}'

.PHONY: k3d-upload-pg-images
k3d-upload-pg-images: ## Pre-upload Postgresql images to K3D test  cluster to speedup tests execution.
	$(info Uploading PG images to K3D test cluster)
	@{ \
	pg_engine_image=$$(kubectl -n everest get dbengine/percona-postgresql-operator -ojson | jq -r '[.status.availableVersions.engine[] | select(.status == "recommended").imagePath][-1] ') ;\
	pg_proxy_image=$$(kubectl -n everest get dbengine/percona-postgresql-operator -ojson | jq -r '[.status.availableVersions.proxy.pgbouncer[] | select(.status == "recommended").imagePath][-1] ') ;\
	pg_backup_image=$$(kubectl -n everest get dbengine/percona-postgresql-operator -ojson | jq -r '[.status.availableVersions.backup[] | select(.status == "recommended").imagePath][-1] ') ;\
	pg_operator_image=$$(kubectl -n everest get deploy/percona-postgresql-operator -o json | jq -r '.spec.template.spec.containers[] | select (.name == "operator").image') ;\
	docker pull -q $${pg_engine_image} ;\
	docker pull -q $${pg_proxy_image} ;\
	docker pull -q $${pg_backup_image} ;\
	docker pull -q $${pg_operator_image} ;\
	k3d image import -c everest-server-test -m direct $${pg_engine_image} $${pg_proxy_image} $${pg_backup_image} $${pg_operator_image} ;\
	}

.PHONY: k3d-upload-psmdb-images
k3d-upload-psmdb-images: ## Pre-upload PSMDB images to K3D test  cluster to speedup tests execution.
	$(info Uploading PSMDB images to K3D test cluster)
	@{ \
	psmdb_engine_image=$$(kubectl -n everest get dbengine/percona-server-mongodb-operator -ojson | jq -r '[.status.availableVersions.engine[] | select(.status == "recommended").imagePath][-1] ') ;\
	psmdb_backup_image=$$(kubectl -n everest get dbengine/percona-server-mongodb-operator -ojson | jq -r '[.status.availableVersions.backup[] | select(.status == "recommended").imagePath][-1] ') ;\
	psmdb_operator_image=$$(kubectl -n everest get deploy/percona-server-mongodb-operator -o json | jq -r '.spec.template.spec.containers[] | select (.name == "percona-server-mongodb-operator").image') ;\
	docker pull -q $${psmdb_engine_image} ;\
	docker pull -q $${psmdb_backup_image}  ;\
	docker pull -q $${psmdb_operator_image}  ;\
	k3d image import -c everest-server-test -m direct $${psmdb_engine_image} $${psmdb_backup_image} $${psmdb_operator_image}  ;\
	}

.PHONY: k3d-upload-pxc-images
k3d-upload-pxc-images: ## Pre-upload PXC images to K3D test cluster to speedup tests execution.
	$(info Uploading PXC images to K3D test cluster)
	@{ \
	pxc_engine_image=$$(kubectl -n everest get dbengine/percona-xtradb-cluster-operator -ojson | jq -r '[.status.availableVersions.engine[] | select(.status == "recommended").imagePath][-1] ') ;\
	pxc_proxy_image=$$(kubectl -n everest get dbengine/percona-xtradb-cluster-operator -ojson | jq -r '[.status.availableVersions.proxy.haproxy[] | select(.status == "recommended").imagePath][-1] ') ;\
	pxc_backup_image=$$(kubectl -n everest get dbengine/percona-xtradb-cluster-operator -ojson | jq -r '[.status.availableVersions.backup[] | select(.status == "recommended").imagePath][-1] ') ;\
	pxc_operator_image=$$(kubectl -n everest get deploy/percona-xtradb-cluster-operator -o json | jq -r '.spec.template.spec.containers[] | select (.name == "percona-xtradb-cluster-operator").image') ;\
	pmm_client_image=percona/pmm-client:2 ;\
	docker pull -q $${pxc_engine_image} ;\
	docker pull -q $${pxc_proxy_image} ;\
	docker pull -q $${pxc_backup_image} ;\
	docker pull -q $${pxc_operator_image} ;\
	docker pull -q  $${pmm_client_image};\
	k3d image import -c everest-server-test -m direct $${pxc_engine_image} $${pxc_proxy_image} $${pxc_backup_image} $${pxc_operator_image} $${pmm_client_image};\
	}

.PHONY: k3d-upload-images
k3d-upload-images: k3d-upload-pg-images k3d-upload-psmdb-images k3d-upload-pxc-images 	## Pre-upload PG,PSMDB,PXC images to K3D test cluster to speedup tests execution.

##@ Development

.PHONY: lint
lint:               ## Run linter typescript checks.
	npm run lint:ts && npm run typecheck && echo 'Lint OK'

.PHONY: lint-fix
lint-fix:           ## Fix linter errors where possible.
	npx eslint --fix .

##@ Test

# Set a particular test, e.g. make test TEST=database-cluster.spec.ts
TEST =
.PHONY: test
test:               ## Run all tests.
	@{ \
  	set -xe ;\
	RAND=$$(echo $${RANDOM} | md5sum | head -c 5 ) ;\
	export PMM1_IP=$$(kubectl get svc/monitoring-service -o json --request-timeout=2m | jq -r '.spec.clusterIP')  ;\
	if [ -z "$${PMM1_IP}" ]; then echo "Cannot get PMM1_IP" ; exit 1 ; fi ;\
	export PMM2_IP=$$(kubectl get svc/monitoring-service -o json --request-timeout=2m -n everest-monitoring | jq -r '.spec.clusterIP') ;\
	if [ -z "$${PMM2_IP}" ]; then echo "Cannot get PMM2_IP" ; exit 1 ; fi ;\
	export PMM1_API_KEY=$$(curl --request POST https://admin:admin@localhost:8090/graph/api/auth/keys --header 'Content-Type: application/json; charset=utf-8' --data "{\"name\":\"everest-test-$${RAND}\",\"role\":\"Admin\"}"  --insecure 2>/dev/null | jq -r '.key') ;\
	if [ -z "$${PMM1_API_KEY}" ]; then echo "Cannot get PMM1_API_KEY" ; exit 1 ; fi ;\
	export PMM2_API_KEY=$$(curl --request POST https://admin:admin@localhost:8091/graph/api/auth/keys --header 'Content-Type: application/json; charset=utf-8' --data "{\"name\":\"everest-test-$${RAND}\",\"role\":\"Admin\"}"  --insecure 2>/dev/null | jq -r '.key') ;\
	if [ -z "$${PMM2_API_KEY}" ]; then echo "Cannot get PMM2_API_KEY" ; exit 1 ; fi ;\
	export API_TOKEN=$$(curl --location -s localhost:8080/v1/session --header 'Content-Type: application/json' --data '{"username": "everest_ci","password": "password"}' | jq -r .token) ;\
	if [ -z "$${API_TOKEN}" ]; then echo "Cannot get API_TOKEN" ; exit 1 ; fi ;\
	export API_TOKEN_TEST=$$(curl --location -s localhost:8080/v1/session --header 'Content-Type: application/json' --data '{"username": "test","password": "password"}' | jq -r .token) ;\
	if [ -z "$${API_TOKEN_TEST}" ]; then echo "Cannot get API_TOKEN_TEST" ; exit 1 ; fi ;\
	npx playwright test $(TEST) ;\
	}

#.PHONY: test-api-pxc
#test-api-pxc:       ## Run tests with @pxc tag.
#	npx playwright test --config=playwright.config.ts -g '@pxc'
