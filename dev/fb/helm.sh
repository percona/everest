#!/usr/bin/env bash

if [[ -z "$HELM_PATH" ]]; then
    echo "Error: HELM_PATH environment variable is empty. Please add the absolute path to your helm build to the HELM_PATH environment variable." >&2
    exit 1
fi

if [[ -z "$VS_IMAGE" ]]; then
    echo "Error: VS_IMAGE environment variable is empty." >&2
    exit 1
fi

# deploy VS and get it's internal IP
SERVICE_IP=$(curl -sfL https://raw.githubusercontent.com/percona/everest/main/dev/fb/vs.sh | bash -s)

# run everest installation with helm
helm install everest-core "$HELM_PATH/charts/everest" --namespace=everest-system --set versionMetadataURL="http://$SERVICE_IP" --timeout=10m --devel
