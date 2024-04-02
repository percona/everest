#!/bin/bash

if ! command -v curl &> /dev/null
then
	echo "curl command not found. Please install it."
	exit
fi
if ! command -v kubectl &> /dev/null
then
	echo "kubectl command not found. Please install it."
	exit
fi

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m | tr '[:upper:]' '[:lower:]')

if [[ ($os == "linux" || $os == "darwin") && $arch == "x86_64" ]]
then
	arch="amd64"
elif [[ $os == "linux" && $arch == "aarch64" ]]
# linux on ARM (tested on Ubuntu 22.10 for ARM64)
then
	arch="arm64"
fi


echo "Downloading the latest release of Everest CLI"
echo "https://github.com/percona/everest/releases/download/v0.9.1/everestctl-$os-$arch"
curl -sL  https://github.com/percona/everest/releases/download/v0.9.1/everestctl-$os-$arch -o everestctl
chmod +x everestctl

# If KUBECONFIG is set let the user know we are using it
if [[ -n "${KUBECONFIG}" ]]; then
	echo "Using KUBECONFIG: ${KUBECONFIG}"
else
	echo "KUBECONFIG is not set. Using default k8s cluster"
fi

echo "Provisioning Everest"
echo ""
./everestctl install --namespaces everest --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard

echo "Your provisioned Everest instance will be available at http://127.0.0.1:8080"
echo "Exposing Everest using kubectl port-forwarding. You can expose it manually"
kubectl port-forward -n everest-system deployment/percona-everest 8080:8080
