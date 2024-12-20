#!/usr/bin/env bash

if [[ -z "$VS_IMAGE" ]]; then
    echo "Error: VS_IMAGE environment variable is empty." >&2
    exit 1
fi

curl https://raw.githubusercontent.com/Percona-Lab/percona-version-service/main/deploy.yaml  > vs_deploy.yaml

# Determine the sed -i option based on the system
if [[ "$(uname)" == "Darwin" ]]; then
  sed_i_option="''"
else
  sed_i_option=""
fi
# use FB VS image in the VS configuration
sed -i "$sed_i_option" "s/perconalab\/version-service:.*/perconalab\/version-service:$VS_IMAGE/g" vs_deploy.yaml

# deploy VS
kubectl apply -f vs_deploy.yaml > /dev/null

# wait until the VS is ready
kubectl wait --for=jsonpath='{.status.readyReplicas}'=3 deployment/percona-version-service > /dev/null

# get the internal IP of the VS
echo "$(kubectl get service percona-version-service -o jsonpath='{.spec.clusterIP}')"
exit 0
