#!/usr/bin/env bash

set -e
set -o pipefail

vs_local_port=8081
everest_svc_name="everest"
everest_namespace="everest-system"
everest_local_port=8080
everest_remote_port=8080

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

# run everest installation with helm
echo "Installing Percona Everest version $(cat version.txt)..."
helm install \
  everest-core \
  "./helm-chart" \
  --version "$(cat version.txt)" \
  --namespace=${everest_namespace} \
  --create-namespace \
  --set versionMetadataURL="http://percona-version-service.default.svc.cluster.local" \
  --timeout=10m \
  --devel \
  "$@"

kubectl wait -n ${everest_namespace} --for=jsonpath='{.status.readyReplicas}'=1 deployment/everest-server --timeout 60s > /dev/null
kubectl port-forward -n ${everest_namespace} svc/${everest_svc_name} ${everest_local_port}:${everest_remote_port} > /dev/null 2>&1 &
echo "*************************************************************"
echo "Everest installation completed successfully."
echo "Use http://localhost:${everest_local_port} to access Everest UI."
echo "*************************************************************"
