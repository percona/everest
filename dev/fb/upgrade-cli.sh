#!/usr/bin/env bash

set -e
set -o pipefail

vs_local_port=8081
everest_svc_name="everest"
everest_namespace="everest-system"
everest_local_port=8080
everest_remote_port=8080

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | tr '[:upper:]' '[:lower:]')
if [[ (${OS} == "linux" || ${OS} == "darwin") && ${ARCH} == "x86_64" ]]
then
	ARCH="amd64"
elif [[ ${OS} == "linux" && ${ARCH} == "aarch64" ]]
then
	ARCH="arm64"
fi

# get the internal IP of the VS
if nc -vz localhost ${vs_local_port} > /dev/null 2>&1 ; then
  echo "Port forwarding for Percona Version Service is already set up."
else
  echo "Deploying Percona Version Service..."
  # deploy VS and get its internal IP
  . ./vs.sh
  # sleep for 2 seconds to make sure the port-forward is ready
  sleep 2
fi

# run everest upgrade with everest CLI
echo "Upgrading Percona Everest to version $(cat version.txt)..."
./everestctl-${OS}-${ARCH} upgrade \
  --chart-dir "./helm-chart" \
  --version-metadata-url "http://localhost:${vs_local_port}"  \
  --helm.set "versionMetadataURL=http://percona-version-service.default.svc.cluster.local" \
  --helm.set "upgrade.preflightChecks=false" \
  --helm.reset-then-reuse-values \
  "$@"

kubectl wait -n ${everest_namespace} --for=jsonpath='{.status.readyReplicas}'=1 deployment/everest-server --timeout 60s > /dev/null
kubectl port-forward -n ${everest_namespace} svc/${everest_svc_name} ${everest_local_port}:${everest_remote_port} > /dev/null 2>&1 &
echo "*************************************************************"
echo "Everest upgrade completed successfully."
echo "Use http://localhost:${everest_local_port} to access Everest UI."
echo "*************************************************************"
