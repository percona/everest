#!/usr/bin/env bash

if [[ -z "${HELM_PATH+set}" ]]; then
  echo "Error: HELM_PATH environment variable is not set." >&2
  exit 1
elif [[ -z "$HELM_PATH" ]]; then
    echo "Error: HELM_PATH environment variable is empty. Please add the absolute path to your helm build to the HELM_PATH environment variable." >&2
    exit 1
fi

if [[ -z "${VS_IMAGE+set}" ]]; then
  echo "Error: VS_IMAGE environment variable is not set." >&2
  exit 1
elif [[ -z "$VS_IMAGE" ]]; then
    echo "Error: VS_IMAGE environment variable is empty." >&2
    exit 1
fi

# deploy VS and get it's internal IP
curl -O https://raw.githubusercontent.com/percona/everest/main/dev/fb/vs.sh vs.sh > /dev/null
chmod +x vs.sh

SERVICE_IP=$(bash ./vs.sh)

# run everest installation with helm
helm install everest-core "$HELM_PATH/charts/everest" --namespace=everest-system --create-namespace --set versionMetadataURL="http://$SERVICE_IP" --timeout=10m --devel
