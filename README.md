# Percona Everest

![Percona Everest](logo.png)

**Note**: Percona Everest is now in **Beta**, and we need your [feedback](https://forums.percona.com/c/percona-everest/81)! We want you to be a part of this journey and help us shape our product.
    

[Percona Everest](https://docs.percona.com/everest/index.html) is an open source cloud-native database platform that helps developers deploy code faster, scale deployments rapidly, and reduce database administration overhead while regaining control over their data, database configuration, and DBaaS costs.

Here’s why you should try Percona Everest:

- Launch database instance with just a few clicks
- Enable your team to develop faster and reduce time to market
- Scale seamlessly
- Simplify maintenance
- Monitor and optimize
- Automate backups
- Ensure data security

If you'd like to get a complete understanding of the features offered by Percona Everest, click on this [link](https://percona.community/projects/everest/).

## Documentation

For comprehensive information about Percona Everest, see the [documentation](https://docs.percona.com/everest/index.html).

# Installation

Ready to try out Percona Everest? Check the [Quickstart install](https://docs.percona.com/everest/quickstart-guide/quick-install.html) section for easy-to-follow steps. 

## Prerequisites

Before getting started with Percona Everest, do the following:

1. Set up a Kubernetes cluster. 

    Percona Everest assists with installing all the necessary operators and required packages, but does not deploy a Kubernetes cluster.

    We recommend setting up Percona Everest on the [Amazon Elastic Kubernetes Service (EKS)](https://docs.percona.com/everest/quickstart-guide/eks.html) or [Google Kubernetes Engine (GKE)](https://docs.percona.com/everest/quickstart-guide/gke.html).

2. Verify that you have access to the Kubernetes cluster that you want to use with Everest. By default, Everest uses the kubeconfig file available under `~/.kube/config`. 

    To verify access to the Kubernetes cluster, run the following command:
   
    ```sh 
    kubectl get nodes
    ```

## Install Percona Everest

To install and provision Percona Everest to Kubernetes:


1. Install the latest version of the Everest CLI by running the following commands:

    **Linux and WSL**
        
    ```sh
    curl -sSL -o everestctl-linux-amd64 https://github.com/percona/percona-everest-cli/releases/latest/download/everestctl-linux-amd64
    sudo install -m 555 everestctl-linux-amd64 /usr/local/bin/everestctl
    rm everestctl-linux-amd64
    ```

    **macOS (Apple Silicon)**

    ```sh
    curl -sSL -o everestctl-darwin-arm64 https://github.com/percona/percona-everest-cli/releases/latest/download/everestctl-darwin-arm64
    sudo install -m 555 everestctl-darwin-arm64 /usr/local/bin/everestctl
    rm everestctl-darwin-arm64
    ```

    **macOS (Intel CPU)**

    ```sh
    curl -sSL -o everestctl-darwin-amd64 https://github.com/percona/percona-everest-cli/releases/latest/download/everestctl-darwin-amd64
    sudo install -m 555 everestctl-darwin-amd64 /usr/local/bin/everestctl
    rm everestctl-darwin-amd64
    ```

2. Install Everest and provision the Kubernetes cluster using one of the following commands:

    ```sh
    everestctl install
    ```

    Enter the specific names for the namespaces you want Everest to manage, separating each name with a comma.

    **Note**: Make sure that you enter at least one namespace.

    Alternatively, you can set multiple namepaces in the headless mode:

      ```sh
      everestctl install --namespaces <namespace-name1>,<namespace-name2> --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard
      ```
    
    Replace `<namespace-name>` with the desired name for your namespace.

    **Note**: Ensure that you copy the authorization token displayed on the terminal in this step. You will need this token to log in to the Percona Everest UI.    

3. Access the Everest UI/API using one of the following options for exposing it, as Everest is not exposed with an external IP by default:

    * Run the following command to use `Kubectl port-forwarding` for connecting to Everest without exposing the service.

        ```sh
        kubectl port-forward svc/everest 8080:8080 -n everest-system
        ``` 

    * Use the following command to change the Everest service type to `LoadBalancer`:
                    
      ```sh
      kubectl patch svc/everest -n everest-system -p '{"spec": {"type": "LoadBalancer"}}'
      ```

4. Retrieve the external IP address for the Everest service. This is the address where you can then launch Everest at the end of the installation procedure. In this example, the external IP address used is the default `127.0.0.1`:  
                
    ```sh 
    kubectl get svc/everest -n everest-system
    ```
                  
5. The Percona Everest app will be available at http://127.0.0.1:8080.

    Now, you can open your browser and create databases in Percona Everest.

# Contributing

We believe that community is the backbone of Percona Everest. That's why we always welcome and encourage you to actively contribute and help us enhance Percona Everest.

See the [Contribution Guide](https://github.com/percona/everest/blob/main/CONTRIBUTING.md) for more information on how you can contribute.

## Communication

We value your thoughts and opinions and we would be thrilled to hear from you! Join us on [Forum](https://forums.percona.com/c/percona-everest) to ask questions, share your feedback, and spark creative ideas with our community.


# Submitting Bug Reports

If you find a bug in Percona Everest, submit a report to that project's [JIRA](https://perconadev.atlassian.net/jira/software/c/projects/EVEREST/boards/65) issue tracker or [create a GitHub issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue#creating-an-issue-from-a-repository) in this repository. 

Learn more about submitting bugs, new features ideas and improvements in the [documentation](https://docs.percona.com/everest/contribute.html).

   


