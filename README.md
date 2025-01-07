# Percona Everest

![!image](logo.png)

[Percona Everest](https://docs.percona.com/everest/index.html) is an open source cloud-native database platform that helps developers deploy code faster, scale deployments rapidly, and reduce database administration overhead while regaining control over their data, database configuration, and DBaaS costs.

Why you should try Percona Everest:

- Launch database instance with just a few clicks
- Enable your team to develop faster and reduce time to market
- Scale seamlessly
- Simplify maintenance
- Monitor and optimize
- Automate backups
- Ensure data security

[Discover all the features and capabilities of Percona Everest](<(https://percona.community/projects/everest/)>) and see how it can transform your database management experience.

## Documentation

For comprehensive information about Percona Everest, see the [documentation](https://docs.percona.com/everest/index.html).
Also, visit our [Storybook](https://percona.github.io/everest/) to check documentation for our UI components (under development).

## Installation

Install **Percona Everest** Using Helm (Recommended)

Helm is the recommended installation method for Percona Everest as it simplifies deployment and resource management in Kubernetes environments.

### Prerequisites

Ensure you have a Kubernetes cluster set up (e.g., Amazon EKS, Google GKE). Install Helm on your local machine: [Helm Installation Guide](https://helm.sh/docs/intro/install/).

### Steps to Install

1. Add the Percona Helm repository:

```bash
helm repo add percona https://percona.github.io/percona-helm-charts/
helm repo update
```

2. Install the Percona Everest Helm Chart:

```bash
helm install everest-core percona/everest \
--namespace everest-system \
--create-namespace
```

3. Access the Percona Everest UI:
   By default, Everest is not exposed via an external IP. Use one of the following options:

- Port Forwarding:

  ```bash
  kubectl port-forward svc/everest 8080:8080 -n everest-system
  ```

  Access the UI at http://127.0.0.1:8080.

- LoadBalancer (Optional):

```bash
kubectl patch svc/everest -n everest-system -p '{"spec": {"type": "LoadBalancer"}}'
kubectl get svc/everest -n everest-system
```

Retrieve the external IP from the kubectl get svc command output.

4. Retrieve Admin Credentials:

```bash
kubectl get secret everest-accounts -n everest-system -o jsonpath='{.data.users\.yaml}' | base64 --decode | yq '.admin.passwordHash'

```

- Default username: admin
- Change the password for security using the server.initialAdminPassword parameter during installation.

## Install Percona Everest using CLI

If you prefer using the CLI for installation, follow these steps.

> Note: Google Container Registry (GCR) is scheduled to be deprecated and will officially shut down on March 18, 2025. All versions of Percona Everest prior to 1.4.0 depend on images hosted on GCR. After the shutdown date, downloading those images will fail.
> We strongly recommend upgrading to Percona Everest version 1.4.0 as soon as possible.
> For more details, refer to the [Container Registry Deprecation Documentation](https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown)

Prerequisites

-Ensure you have a Kubernetes cluster set up (e.g., Amazon EKS, Google GKE).

- Verify access to your Kubernetes cluster:

```bash
kubectl get nodes
```

- Ensure your kubeconfig file is located in the default path `~/.kube/config`. If not, set the path using the following command:

```bash
export KUBECONFIG=~/.kube/config
```

Steps to Install

Starting from version 1.4.0, everestctl uses the Helm chart to install Percona Everest. You can configure chart parameters using:

- --helm.set for individual parameters.
- --helm.values to provide a values file.

1. Download the Everest CLI:

   **Linux and WSL**

   ```sh
   curl -sSL -o everestctl-linux-amd64 https://github.com/percona/everest/releases/latest/download/everestctl-linux-amd64
   sudo install -m 555 everestctl-linux-amd64 /usr/local/bin/everestctl
   rm everestctl-linux-amd64
   ```

   **macOS (Apple Silicon)**

   ```sh
   curl -sSL -o everestctl-darwin-arm64 https://github.com/percona/everest/releases/latest/download/everestctl-darwin-arm64
   sudo install -m 555 everestctl-darwin-arm64 /usr/local/bin/everestctl
   rm everestctl-darwin-arm64

   ```

   **macOS (Intel CPU)**

   ```sh
   curl -sSL -o everestctl-darwin-amd64 https://github.com/percona/everest/releases/latest/download/everestctl-darwin-amd64
   sudo install -m 555 everestctl-darwin-amd64 /usr/local/bin/everestctl
   rm everestctl-darwin-amd64

   ```

2. Install Percona Everest Using the Wizard:
   Run the following command and specify the namespaces for Everest to manage:

   ```sh
   everestctl install
   ```

   If you skip adding namespaces, you can add them later:

```bash
everestctl namespaces add <NAMESPACE>

```

3. Install Percona Everest in Headless Mode:
   Run the following command to set namespaces and database operators during installation:

```bash
everestctl install --namespaces <namespace-name1>,<namespace-name2> --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard

```

4. Access Admin Credentials:
   Retrieve the generated admin password:

```bash
everestctl accounts initial-admin-password

```

5. Access the Everest UI:

Use one of the following methods to access the UI:

- Port Forwarding:

```bash
kubectl port-forward svc/everest 8080:8080 -n everest-system
```

Open the UI at http://127.0.0.1:8080.

- LoadBalancer (Optional):

```bash
kubectl patch svc/everest -n everest-system -p '{"spec": {"type": "LoadBalancer"}}'
```

# Need help?

|                                                                                                         **Commercial Support**                                                                                                          |                                                       **Community Support**                                                        |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------: |
| <br/>Percona offers expert cloud-native support and services to simplify your database management, featuring 24/7 assistance, consulting, managed services, and training designed to maximize your cloud database operations.<br/><br/> | <br/>Connect with our engineers and fellow users for general questions, troubleshooting, and sharing feedback and ideas.<br/><br/> |
|                                                                                          **[Get Percona Support](https://hubs.ly/Q02ZTH8-0)**                                                                                           |                               **[Visit our Forum](https://forums.percona.com/c/percona-everest/81)**                               |

# Contributing

We believe that community is the backbone of Percona Everest. That's why we always welcome and encourage you to actively contribute and help us enhance Percona Everest.

See the [Contribution Guide](https://github.com/percona/everest/blob/main/CONTRIBUTING.md) for more information on how you can contribute.

## Communication

We value your thoughts and opinions and we would be thrilled to hear from you! Join us on [Forum](https://forums.percona.com/c/percona-everest) to ask questions, share your feedback, and spark creative ideas with our community.

# Submitting Bug Reports

If you find a bug in Percona Everest, submit a report to that project's [JIRA](https://perconadev.atlassian.net/jira/software/c/projects/EVEREST/boards/65) issue tracker or [create a GitHub issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue#creating-an-issue-from-a-repository) in this repository.

Learn more about submitting bugs, new features ideas and improvements in the [documentation](https://docs.percona.com/everest/contribute.html).
