# Contributing to Percona Everest API Server

Percona Everest API Server uses two types of methods:

- "own" methods, such as registering a Kubernetes cluster in Everest and listing the clusters.
-  proxy methods for the Kubernetes API, including all resource-related methods like database-cluster, database-cluster-restore, and database-engine.

The API server basic code is generated using [oapi-codegen](https://github.com/deepmap/oapi-codegen) from the docs/spec/openapi.yml file.
The proxy methods align with Everest operator methods but don't support all original parameters, because these are not required.
You can find the definition of the custom resources in the [Everest operator repo](https://github.com/percona/everest-operator/tree/main/config/crd/bases).

### Run everest locally
0. Prerequisites:
    - Golang 1.24.x
    - Make 3.x
    - Docker 20.x
    - Git 2.x
    - k3d 5.x
1. Check out the repo:
`git clone https://github.com/percona/everest`
2. Navigate to the repo folder:
`cd everest`
3. Check out a particular branch if needed:
`git checkout <branch_name>`
4. Run the dev environment:
`make k3d-cluster-reset`
5. Build CLI: `make build-cli`
6. Deploy the build: `make deploy`

### Add a new proxy method
1. Copy the corresponding k8s spec to the [openapi.yml](./docs/spec/openapi.yml). For information on observing your cluster API, see [Kubernetes: How to View Swagger UI blog post](https://jonnylangefeld.com/blog/kubernetes-how-to-view-swagger-ui), which details the operator-defined methods (if the everest operator is installed).

2. Make necessary spec modifications. When designing new methods:

-  follow the [Restful API guidelines](https://opensource.zalando.com/restful-api-guidelines/). - - use kebab-case instead of everest operator API.
- determine parameters to expose via proxy.
3. If needed, copy the custom resources schema from the [Everest operator config](https://github.com/percona/dbaas-operator/tree/main/config/crd/bases) to the **Components** section of the [openapi.yml](./docs/spec/openapi.yml) file.

4. Run the following command to generate the code:
```
 $ make init
 $ make gen
```
5. Implement the missing `ServerInterface` methods.
6. Run `make format` to format the code and group the imports.
7. Run `make check` to verify that your code works and meets all style requirements.


### Running integration tests

To run integration tests, see [Percona Everest API integration tests](api-tests/README.md).

### Working with local Kubernetes instances like Minikube or Kind

When working with local Kubernetes clusters, Everest API server cannot connect to them because they often use `127.0.0.1` or `localhost` addresses. However, it is possible to connect to the host machine using `host.docker.internal` hostname since Everest API Server runs inside a Docker container.

To do this, add the following host to the `/etc/hosts` file on your local machine:

```
127.0.0.1          host.docker.internal
```

#### Running minikube clusters
1. Spin up a Minikube cluster, using`--apiserver-names host.docker.internal`, depending on your operating system.

2. Run the `make local-env-up` command from [everest-operator](https://github.com/percona/everest-operator/blob/main/Makefile#L301). This command works fine on MacOS.

3. Once the Minikube cluster's kubeconfig is available, update the server address in the kubeconfig file from `127.0.0.1` to `host.docker.internal`, while maintaining the same port.


4. Use Everest by initiating the provisioning procedure through the command line interface.

### Troubleshooting

Here are some commands that can help you fix potential issues:
#### Operator installation process
```
kubectl -n namespace get sub         # Check that subscription was created for an operator
kubectl -n namespace get ip          # Check that install plan was created and approved for an operator
kubectl -n namespace get csv         # Check that Cluster service version was created and phase is Installed
kubectl -n namespace get deployment  # Check that deployment exist
kubectl -n namespace get po          # Check that pods for an operator is running
kubectl -n namespace logs <podname>  # Check logs for a pod
```
#### Database Cluster troubleshooting

```
kubectl -n namespace get db          # Get list of database clusters
kubectl -n namespace get po          # Get pods for a database cluster
kubectl -n namespace describe db     # Describe database cluster. Provides useful information about conditions or messages
kubectl -n namespace describe pxc    # Describe PXC cluster
kubectl -n namespace describe psmdb  # Describe PSMDB cluster
kubectl -n namespace describe pg     # Describe PG cluster
kubectl -n namespace logs <podname>  # Check logs for a pod
```

#### PVC troubleshooting
```
kubectl -n namespace get pvc  # PVCs should be Bound
```
