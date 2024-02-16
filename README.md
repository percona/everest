## Welcome to Percona Everest Backend

Percona Everest is an open source Database-as-a-Service solution that automates day-one and day-two operations for Postgres, MySQL, and MongoDB databases within Kubernetes clusters.

## Prerequisites

A Kubernetes cluster is available for public use, but we do not offer support for creating one.

## Creating Kubernetes cluster

You must have a publicly accessible Kubernetes cluster to use Everest. EKS or GKE is recommended, as it may be difficult to make it work with local installations of Kubernetes such as minikube, kind, k3d, or similar products. Everest does not help with spinning up a Kubernetes cluster but assists with installing all the necessary components for Everest to run.


## Getting started

The Percona Everest has [CLI](https://github.com/percona/percona-everest-cli), which installs Everest's required components.


### Everest provisioning

1. Download the latest release of [everestctl](https://github.com/percona/percona-everest-cli/releases) command for your operating system

2. Modify the permissions of the file:

  ```sh
  chmod +x everestctl-darwin-amd64
  ```

3. Run the following command to install all the required operators in headless mode:

  ```sh
   ./everestctl-darwin-amd64 install --monitoring.enable=false --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard
  ```

Alternatively, use the wizard to run it:

✗ ./everestctl install operators
? Do you want to enable monitoring? No
? What operators do you want to install? MySQL, MongoDB, PostgreSQL
```

Once provisioning is complete, you can expose your everest installation using the following command

```
  kubectl port-forward -n everest-system deployment/percona-everest 8080:8080
```

You can visit http://127.0.0.1:8080 to create your first database cluster!


## Known limitations

- There are no authentication or access control features, but you can integrate Everest with your existing solution.
    * [Ambassador](https://github.com/datawire/ambassador) via
  [auth service](https://www.getambassador.io/reference/services/auth-service)
    * [Envoy](https://www.envoyproxy.io) via the
  [External Authorization HTTP Filter](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ext_authz_filter.html)
    * AWS API Gateway via
  [Custom Authorizers](https://aws.amazon.com/de/blogs/compute/introducing-custom-authorizers-in-amazon-api-gateway/)
    * [Nginx](https://www.nginx.com) via
  [Authentication Based on Subrequest Result](https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-subrequest-authentication/)
