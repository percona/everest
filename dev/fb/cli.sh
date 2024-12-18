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
kubectl apply -f vs_deploy.yaml

# wait until the VS is ready
kubectl wait --for=jsonpath='{.status.readyReplicas}'=3 deployment/percona-version-service

# get the internal IP of the VS
SERVICE_IP=`kubectl get service percona-version-service -o jsonpath='{.spec.clusterIP}'`

kubectl port-forward svc/percona-version-service 8081:80 &

# run everest installation with everest CLI
EVEREST_CTL_PATH="/Users/oxanagrishchenko/Downloads/everestctl-1.10000.0-rc20241217095910"
$EVEREST_CTL_PATH install --chart-dir "$HELM_PATH/charts/everest" --version $VERSION --version-metadata-url http://localhost:8081  --operator.xtradb-cluster --operator.mongodb --operator.postgresql --skip-wizard --namespaces everest -v --helm.set "versionMetadataURL=http://$SERVICE_IP"
