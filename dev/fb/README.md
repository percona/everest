### This directory holds scripts that help to run Everest Feature Builds (FB)

The scripts:
- `vs.sh` - deploys Percona Version Service. In common case, this script should not be run manually, it's being run by other scripts.
- `install-helm.sh` - runs `vs.sh` under the hood, exposes VS with port-forwarding and then runs Everest helm installation.
- `upgrade-helm.sh` - runs `vs.sh` under the hood, exposes VS with port-forwarding and then runs Everest helm upgrade.
- `install-cli.sh` - runs `vs.sh` under the hood, exposes VS with port-forwarding and then runs Everest CLI installation.
- `upgrade-cli.sh` - runs `vs.sh` under the hood, exposes VS with port-forwarding and then runs Everest deployment upgrade using CLI.

#### Prerequisites:
1. Download and unzip archive with FB.
2. Navigate to `1.10000.0-rc<...>` directory

## Install the Feature Build

#### a. Using Helm:
```sh
./install-helm.sh
```
NOTE: it is possible to pass an additional flags to the script that will be bypassed directly to `helm install` command , for example:
```sh
./install-helm.sh --set server.initialAdminPassword=admin
```

#### b. Using CLI:
```sh
./install-cli.sh
```
NOTE: it is possible to pass an additional flags to the script that will be bypassed directly to `everestctl install` command , for example:
```sh
./install-cli.sh --helm.set server.initialAdminPassword=admin
```

## Upgrade Everest deployment to the Feature Build
NOTE: Before running upgrade scripts, make sure that Everest is already installed in the cluster.
You should use the same tool for upgrading Everest deployment that have been used for installation (Helm or CLI).

#### a. Using Helm:
```sh
./upgrade-helm.sh
```
NOTE: it is possible to pass an additional flags to the script that will be bypassed directly to `helm upgrade` command , for example:
```sh
./upgrade-helm.sh --set server.initialAdminPassword=admin
```

#### b. Using CLI:
```sh
./upgrade-cli.sh
```
NOTE: it is possible to pass an additional flags to the script that will be bypassed directly to `everestctl upgrade` command , for example:
```sh
./upgrade-cli.sh --helm.set server.initialAdminPassword=admin
```