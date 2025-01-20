#!/usr/bin/env bash

# deploy VS and get it's internal IP
SERVICE_IP=$(./vs.sh)

# run everest installation with helm
helm install everest-core "helm-chart" --namespace=everest-system --create-namespace --set versionMetadataURL="http://$SERVICE_IP" --timeout=10m --devel
