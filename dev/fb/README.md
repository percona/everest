### This directory holds scripts that help to run Everest Feature Builds (FB)

The scripts:
- `vs.sh` - deploys VS and returns its internal IP. In common case, this script should not be run manually, it's being run by other two scripts.
- `helm.sh` - runs `vs.sh` under the hood and then runs Everest helm installation.
- `cli.sh` - runs `vs.sh` under the hood, exposes VS with port-forwarding and then runs Everest cli installation.

#### Prerequisites:
1. Download the artifacts you need (helm, cli) from the FB pipeline
2. Navigate to `the everest/dev/fb` directory
3. Install the Feature build:

#### a. Using Helm:
```sh
VS_IMAGE=<VS_TAG> HELM_PATH=<path_to_your_helmchart> sh helm.sh
```

for example

```sh
VS_IMAGE=everest-test20241217095910 HELM_PATH=/Users/oxana/Downloads/percona-helm-charts sh helm.sh
```


#### b. Using CLI:

```sh
VS_IMAGE=<VS_TAG> HELM_PATH=<path_to_your_helmchart> VERSION=<FB_VERSION_NAME> EVEREST_CTL_PATH=<PATH_TO_EVERESTCTL_BUILD> sh cli.sh
```

for example

```sh
VS_IMAGE=everest-test20241217095910 VERSION=1.10000.0-rc20241217095910 HELM_PATH=/Users/oxana/Downloads/percona-helm-charts  EVEREST_CTL_PATH=/Users/oxana/Downloads/everestctl-everestctl-darwin-arm64 sh cli.sh
```
