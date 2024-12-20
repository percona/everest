#!/usr/bin/env bash

if [[ -z "${VS_IMAGE+set}" ]]; then
  echo "Error: VS_IMAGE environment variable is not set." >&2
  exit 1
elif [[ -z "$VS_IMAGE" ]]; then
    echo "Error: VS_IMAGE environment variable is empty." >&2
    exit 1
fi

if [[ -z "${VERSION+set}" ]]; then
  echo "Error: VERSION environment variable is not set." >&2
  exit 1
elif [[ -z "$VERSION" ]]; then
    echo "Error: VERSION environment variable is empty." >&2
    exit 1
fi

if [[ -z "${HELM_PATH+set}" ]]; then
  echo "Error: HELM_PATH environment variable is not set." >&2
  exit 1
elif [[ -z "$HELM_PATH" ]]; then
    echo "Error: HELM_PATH environment variable is empty. Please add the absolute path to your helm build to the HELM_PATH environment variable." >&2
    exit 1
fi

if [[ -z "${EVEREST_CTL_PATH+set}" ]]; then
  echo "Error: EVEREST_CTL_PATH environment variable is not set." >&2
  exit 1
elif [[ -z "$EVEREST_CTL_PATH" ]]; then
    echo "Error: EVEREST_CTL_PATH environment variable is empty. Please add the absolute path to your everestctl binary to the EVEREST_CTL_PATH environment variable." >&2
    exit 1
fi

# deploy VS and get it's internal IP
curl -O https://raw.githubusercontent.com/percona/everest/main/dev/fb/vs.sh vs.sh > /dev/null
chmod +x vs.sh
SERVICE_IP=$(curl -sfL https://raw.githubusercontent.com/percona/everest/main/dev/fb/vs.sh | bash -s)

kubectl port-forward svc/percona-version-service 8081:80 &

# run everest installation with everest CLI
$EVEREST_CTL_PATH install --chart-dir "$HELM_PATH/charts/everest" --version $VERSION --version-metadata-url http://localhost:8081  --operator.xtradb-cluster --operator.mongodb --operator.postgresql --skip-wizard --namespaces everest -v --helm.set "versionMetadataURL=http://$SERVICE_IP"
