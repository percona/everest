#!/usr/bin/env bash

if [[ -z "$VS_IMAGE" ]]; then
    echo "Error: VS_IMAGE environment variable is empty." >&2
    exit 1
fi

if [[ -z "$VERSION" ]]; then
    echo "Error: VERSION environment variable is empty." >&2
    exit 1
fi

if [[ -z "$HELM_PATH" ]]; then
    echo "Error: HELM_PATH environment variable is empty. Please add the absolute path to your helm build to the HELM_PATH environment variable." >&2
    exit 1
fi

if [[ -z "$EVEREST_CTL_PATH" ]]; then
    echo "Error: EVEREST_CTL_PATH environment variable is empty." >&2
    exit 1
fi

# deploy VS and get it's internal IP
SERVICE_IP=$(curl -sfL https://raw.githubusercontent.com/percona/everest/main/dev/fb/vs.sh | bash -s)

kubectl port-forward svc/percona-version-service 8081:80 &

# run everest installation with everest CLI
"$EVEREST_CTL_PATH" install --chart-dir "$HELM_PATH/charts/everest" --version "$VERSION" --version-metadata-url http://localhost:8081  --operator.xtradb-cluster --operator.mongodb --operator.postgresql --skip-wizard --namespaces everest -v --helm.set "versionMetadataURL=http://$SERVICE_IP"
