#!/usr/bin/env bash

# deploy VS
kubectl apply -f vs_deploy.yaml > /dev/null

# wait until the VS is ready
kubectl wait --for=jsonpath='{.status.readyReplicas}'=3 deployment/percona-version-service --timeout 60s > /dev/null

# get the internal IP of the VS
echo "$(kubectl get service percona-version-service -o jsonpath='{.spec.clusterIP}')"
exit 0
