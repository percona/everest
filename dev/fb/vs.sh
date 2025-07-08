#!/usr/bin/env bash

deploy_name="percona-version-service"
svc_name="${deploy_name}"
local_port=8081
remote_port=80

# deploy VS
kubectl apply -f vs_deploy.yaml > /dev/null

# wait until the VS is ready
kubectl wait --for=jsonpath='{.status.readyReplicas}'=1 deployment/${deploy_name} --timeout 60s > /dev/null
kubectl wait --for=jsonpath='{.spec.clusterIP}' svc/${svc_name} --timeout 60s > /dev/null

kubectl port-forward svc/${svc_name} ${local_port}:${remote_port} > /dev/null 2>&1 &

# wait for $localport to become available
while ! nc -vz localhost ${local_port} > /dev/null 2>&1 ; do
    sleep 0.1
done
