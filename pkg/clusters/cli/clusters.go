// clusters.go
// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package cli holds commands for clusters command.
package cli

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	// FIXME
	"github.com/rodaine/table"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapiv1 "k8s.io/client-go/tools/clientcmd/api/v1"
	"sigs.k8s.io/yaml"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/install"
	"github.com/percona/everest/pkg/cli/namespaces"
	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/clusters"
	myk8s "github.com/percona/everest/pkg/kubernetes"
)

// EverestManagerServiceAccount is the name of the service account for managing a cluster
const (
	EverestManagerServiceAccount     = "everest-manager"
	EverestManagerClusterRole        = "everest-manager-role"
	EverestManagerClusterRoleBinding = "everest-manager-role-binding"
	SATokenSecretSuffix              = "-long-lived-token"
	ClusterAuthRequestTimeout        = 10 * time.Second
	BearerTokenTimeout               = 30 * time.Second
)

// EverestManagerPolicyRules are the policies to give everest-manager
var EverestManagerClusterPolicyRules = []rbacv1.PolicyRule{
	{
		APIGroups: []string{"*"},
		Resources: []string{"*"},
		Verbs:     []string{"*"},
	},
	{
		NonResourceURLs: []string{"*"},
		Verbs:           []string{"*"},
	},
}

// EverestManagerNamespacePolicyRules are the namespace level policies to give everest-manager
var EverestManagerNamespacePolicyRules = []rbacv1.PolicyRule{
	{
		APIGroups: []string{"*"},
		Resources: []string{"*"},
		Verbs:     []string{"*"},
	},
}

type (
	// Config holds the configuration for the clusters subcommands.
	Config struct {
		KubeconfigPath string
		Pretty         bool
	}

	// Clusters provides functionality for managing k8s clusters.
	Clusters struct {
		clusterManager clusters.Interface
		l              *zap.SugaredLogger
		config         Config
		kubeClient     myk8s.KubernetesConnector
	}
)

func NewClusters(c Config, l *zap.SugaredLogger) (*Clusters, error) {
	cli := &Clusters{
		l:      l.With("component", "clusters"),
		config: c,
	}
	if c.Pretty {
		cli.l = zap.NewNop().Sugar()
	}
	k, err := cliutils.NewKubeConnector(cli.l, c.KubeconfigPath, "")
	if err != nil {
		return nil, err
	}
	// Initialize the Kubernetes client for clusters management
	cli.kubeClient = k
	// Initialize the clusters manager
	cli.clusterManager = k.Clusters()
	return cli, nil
}

type AddOptions struct {
	Name string
	// Installation options
	VersionMetadataURL string
	Version            string
	DisableTelemetry   bool
	ClusterType        myk8s.ClusterType
	SkipEnvDetection   bool
	SkipDBNamespace    bool
	HelmConfig         helm.CLIOptions
	NamespaceAddConfig namespaces.NamespaceAddConfig
}

// NewAddOptions returns a new AddOptions with default values.
func NewAddOptions(name string) AddOptions {
	return AddOptions{
		Name:               name,
		ClusterType:        myk8s.ClusterTypeUnknown,
		NamespaceAddConfig: namespaces.NewNamespaceAddConfig(),
	}
}

func getRestConfig(pathOpts *clientcmd.PathOptions, ctxName string) (*rest.Config, error) {
	config, err := pathOpts.GetStartingConfig()
	if err != nil {
		return nil, err
	}

	clstContext := config.Contexts[ctxName]
	if clstContext == nil {
		return nil, fmt.Errorf("context %s does not exist in kubeconfig", ctxName)
	}

	overrides := clientcmd.ConfigOverrides{
		Context: *clstContext,
	}

	clientConfig := clientcmd.NewDefaultClientConfig(*config, &overrides)
	conf, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, err
	}

	return conf, nil
}

// GetKubePublicEndpoint returns the kubernetes apiserver endpoint and certificate authority data as published
// in the kube-public.
func GetKubePublicEndpoint(client kubernetes.Interface) (string, []byte, error) {
	clusterInfo, err := client.CoreV1().ConfigMaps("kube-public").Get(context.TODO(), "cluster-info", metav1.GetOptions{})
	if err != nil {
		return "", nil, err
	}
	kubeconfig, ok := clusterInfo.Data["kubeconfig"]
	if !ok {
		return "", nil, errors.New("cluster-info does not contain a public kubeconfig")
	}
	// Parse Kubeconfig and get server address
	config := &clientcmdapiv1.Config{}
	err = yaml.Unmarshal([]byte(kubeconfig), config)
	if err != nil {
		return "", nil, fmt.Errorf("failed to parse cluster-info kubeconfig: %w", err)
	}
	if len(config.Clusters) == 0 {
		return "", nil, errors.New("cluster-info kubeconfig does not have any clusters")
	}

	endpoint := config.Clusters[0].Cluster.Server
	certificateAuthorityData := config.Clusters[0].Cluster.CertificateAuthorityData
	return endpoint, certificateAuthorityData, nil
}

// CreateServiceAccount creates a service account in a given namespace
func CreateServiceAccount(
	clientset kubernetes.Interface,
	serviceAccountName string,
	namespace string,
) error {
	serviceAccount := corev1.ServiceAccount{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ServiceAccount",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      serviceAccountName,
			Namespace: namespace,
		},
	}
	_, err := clientset.CoreV1().ServiceAccounts(namespace).Create(context.Background(), &serviceAccount, metav1.CreateOptions{})
	if err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("failed to create service account %q in namespace %q: %w", serviceAccountName, namespace, err)
		}
		// log.Infof("ServiceAccount %q already exists in namespace %q", serviceAccountName, namespace)
		fmt.Printf("ServiceAccount %q already exists in namespace %q\n", serviceAccountName, namespace)
		return nil
	}
	// log.Infof("ServiceAccount %q created in namespace %q", serviceAccountName, namespace)
	fmt.Printf("ServiceAccount %q created in namespace %q\n", serviceAccountName, namespace)
	return nil
}

func upsert(kind string, name string, create func() (any, error), update func() (any, error)) error {
	_, err := create()
	if err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("failed to create %s %q: %w", kind, name, err)
		}
		_, err = update()
		if err != nil {
			return fmt.Errorf("failed to update %s %q: %w", kind, name, err)
		}
		// log.Infof("%s %q updated", kind, name)
		fmt.Printf("%s %q updated\n", kind, name)
	} else {
		// log.Infof("%s %q created", kind, name)
		fmt.Printf("%s %q created\n", kind, name)
	}
	return nil
}

func upsertClusterRole(clientset kubernetes.Interface, name string, rules []rbacv1.PolicyRule) error {
	clusterRole := rbacv1.ClusterRole{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "ClusterRole",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		Rules: rules,
	}
	return upsert("ClusterRole", name, func() (any, error) {
		return clientset.RbacV1().ClusterRoles().Create(context.Background(), &clusterRole, metav1.CreateOptions{})
	}, func() (any, error) {
		return clientset.RbacV1().ClusterRoles().Update(context.Background(), &clusterRole, metav1.UpdateOptions{})
	})
}

func upsertRole(clientset kubernetes.Interface, name string, namespace string, rules []rbacv1.PolicyRule) error {
	role := rbacv1.Role{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "Role",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		Rules: rules,
	}
	return upsert("Role", fmt.Sprintf("%s/%s", namespace, name), func() (any, error) {
		return clientset.RbacV1().Roles(namespace).Create(context.Background(), &role, metav1.CreateOptions{})
	}, func() (any, error) {
		return clientset.RbacV1().Roles(namespace).Update(context.Background(), &role, metav1.UpdateOptions{})
	})
}

func upsertClusterRoleBinding(clientset kubernetes.Interface, name string, clusterRoleName string, subject rbacv1.Subject) error {
	roleBinding := rbacv1.ClusterRoleBinding{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "ClusterRoleBinding",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
		Subjects: []rbacv1.Subject{subject},
	}
	return upsert("ClusterRoleBinding", name, func() (any, error) {
		return clientset.RbacV1().ClusterRoleBindings().Create(context.Background(), &roleBinding, metav1.CreateOptions{})
	}, func() (any, error) {
		return clientset.RbacV1().ClusterRoleBindings().Update(context.Background(), &roleBinding, metav1.UpdateOptions{})
	})
}

func upsertRoleBinding(clientset kubernetes.Interface, name string, roleName string, namespace string, subject rbacv1.Subject) error {
	roleBinding := rbacv1.RoleBinding{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "RoleBinding",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     roleName,
		},
		Subjects: []rbacv1.Subject{subject},
	}
	return upsert("RoleBinding", fmt.Sprintf("%s/%s", namespace, name), func() (any, error) {
		return clientset.RbacV1().RoleBindings(namespace).Create(context.Background(), &roleBinding, metav1.CreateOptions{})
	}, func() (any, error) {
		return clientset.RbacV1().RoleBindings(namespace).Update(context.Background(), &roleBinding, metav1.UpdateOptions{})
	})
}

// InstallClusterManagerRBAC installs RBAC resources for a cluster manager to operate a cluster. Returns a token
func InstallClusterManagerRBAC(clientset kubernetes.Interface, ns string, namespaces []string, bearerTokenTimeout time.Duration) (string, error) {
	err := CreateServiceAccount(clientset, EverestManagerServiceAccount, ns)
	if err != nil {
		return "", err
	}

	if len(namespaces) == 0 {
		err = upsertClusterRole(clientset, EverestManagerClusterRole, EverestManagerClusterPolicyRules)
		if err != nil {
			return "", err
		}

		err = upsertClusterRoleBinding(clientset, EverestManagerClusterRoleBinding, EverestManagerClusterRole, rbacv1.Subject{
			Kind:      rbacv1.ServiceAccountKind,
			Name:      EverestManagerServiceAccount,
			Namespace: ns,
		})
		if err != nil {
			return "", err
		}
	} else {
		for _, namespace := range namespaces {
			err = upsertRole(clientset, EverestManagerClusterRole, namespace, EverestManagerNamespacePolicyRules)
			if err != nil {
				return "", err
			}

			err = upsertRoleBinding(clientset, EverestManagerClusterRoleBinding, EverestManagerClusterRole, namespace, rbacv1.Subject{
				Kind:      rbacv1.ServiceAccountKind,
				Name:      EverestManagerServiceAccount,
				Namespace: ns,
			})
			if err != nil {
				return "", err
			}
		}
	}

	return GetServiceAccountBearerToken(clientset, ns, EverestManagerServiceAccount, bearerTokenTimeout)
}

// GetServiceAccountBearerToken determines if a ServiceAccount has a
// bearer token secret to use or if a secret should be created. It then
// waits for the secret to have a bearer token if a secret needs to
// be created and returns the token in encoded base64.
func GetServiceAccountBearerToken(clientset kubernetes.Interface, ns string, sa string, timeout time.Duration) (string, error) {
	secretName, err := getOrCreateServiceAccountTokenSecret(clientset, sa, ns)
	if err != nil {
		return "", err
	}

	var secret *corev1.Secret
	err = wait.PollUntilContextTimeout(context.Background(), 500*time.Millisecond, timeout, true, func(ctx context.Context) (bool, error) {
		ctx, cancel := context.WithTimeout(ctx, ClusterAuthRequestTimeout)
		defer cancel()
		secret, err = clientset.CoreV1().Secrets(ns).Get(ctx, secretName, metav1.GetOptions{})
		if err != nil {
			return false, fmt.Errorf("failed to get secret %q for serviceaccount %q: %w", secretName, sa, err)
		}

		_, ok := secret.Data[corev1.ServiceAccountTokenKey]
		if !ok {
			return false, nil
		}

		return true, nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to get token for serviceaccount %q: %w", sa, err)
	}

	return string(secret.Data[corev1.ServiceAccountTokenKey]), nil
}

// getOrCreateServiceAccountTokenSecret will create a
// kubernetes.io/service-account-token secret associated with a
// ServiceAccount named '<service account name>-long-lived-token', or
// use the existing one with that name.
// This was added to help add k8s v1.24+ clusters.
func getOrCreateServiceAccountTokenSecret(clientset kubernetes.Interface, serviceaccount, namespace string) (string, error) {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      serviceaccount + SATokenSecretSuffix,
			Namespace: namespace,
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: serviceaccount,
			},
		},
		Type: corev1.SecretTypeServiceAccountToken,
	}

	ctx, cancel := context.WithTimeout(context.Background(), ClusterAuthRequestTimeout)
	defer cancel()
	_, err := clientset.CoreV1().Secrets(namespace).Create(ctx, secret, metav1.CreateOptions{})

	switch {
	case apierrors.IsAlreadyExists(err):
		// log.Infof("Using existing bearer token secret %q for ServiceAccount %q", secret.Name, serviceaccount)
		fmt.Printf("Using existing bearer token secret %q for ServiceAccount %q\n", secret.Name, serviceaccount)
	case err != nil:
		return "", fmt.Errorf("failed to create secret %q for serviceaccount %q: %w", secret.Name, serviceaccount, err)
	default:
		// log.Infof("Created bearer token secret %q for ServiceAccount %q", secret.Name, serviceaccount)
		fmt.Printf("Created bearer token secret %q for ServiceAccount %q\n", secret.Name, serviceaccount)
	}

	return secret.Name, nil
}

// Add a new k8s cluster.
func (c *Clusters) Add(ctx context.Context, opts AddOptions) error {
	pathOpts := clientcmd.NewDefaultPathOptions()
	contextName := opts.Name
	conf, err := getRestConfig(pathOpts, contextName)
	if err != nil {
		return fmt.Errorf("failed to get rest config for context '%s': %w", contextName, err)
	}
	clientset, err := kubernetes.NewForConfig(conf)
	if err != nil {
		return fmt.Errorf("failed to create kubernetes client for context '%s': %w", contextName, err)
	}
	managerBearerToken := ""
	// FIXME namespaces
	managerBearerToken, err = InstallClusterManagerRBAC(clientset, "default", []string{}, BearerTokenTimeout)
	if err != nil {
		return fmt.Errorf("failed to install cluster manager RBAC for context '%s': %w", contextName, err)
	}
	tlsClientConfig := clusters.TLSClientConfig{
		Insecure:   conf.Insecure,
		ServerName: conf.ServerName,
		CAData:     conf.CAData,
		CertData:   conf.CertData,
		KeyData:    conf.KeyData,
	}
	clst := &clusters.Cluster{
		Name:   opts.Name,
		Server: conf.Host,
		Config: clusters.ClusterConfig{
			TLSClientConfig:    tlsClientConfig,
			DisableCompression: conf.DisableCompression,
		},
	}
	// Bearer token will preferentially be used for auth if present,
	// Even in presence of key/cert credentials
	// So set bearer token only if the key/cert data is absent
	if len(tlsClientConfig.CertData) == 0 || len(tlsClientConfig.KeyData) == 0 {
		clst.Config.BearerToken = managerBearerToken
	}

	// Create the cluster in the management cluster
	if err := c.clusterManager.Create(ctx, clst); err != nil {
		return err
	}

	// Now install Everest in the new cluster
	opts.NamespaceAddConfig.Context = contextName
	installCfg := install.InstallConfig{
		KubeconfigPath:     c.config.KubeconfigPath,
		Context:            contextName,
		VersionMetadataURL: opts.VersionMetadataURL,
		Version:            opts.Version,
		DisableTelemetry:   opts.DisableTelemetry,
		ClusterType:        opts.ClusterType,
		SkipEnvDetection:   opts.SkipEnvDetection,
		Pretty:             c.config.Pretty,
		SkipDBNamespace:    opts.SkipDBNamespace,
		HelmConfig:         opts.HelmConfig,
		NamespaceAddConfig: opts.NamespaceAddConfig,
	}

	installer, err := install.NewInstall(installCfg, c.l)
	if err != nil {
		return fmt.Errorf("failed to create installer: %w", err)
	}

	if err := installer.Run(ctx); err != nil {
		return fmt.Errorf("failed to install Everest in cluster '%s': %w", contextName, err)
	}

	return nil
}

// RemoveOptions holds options for removing a cluster.
type RemoveOptions struct {
	Name string
}

// Remove a k8s cluster.
func (c *Clusters) Remove(ctx context.Context, opts RemoveOptions) error {
	c.l.Infof("Removing cluster '%s'", opts.Name)
	// TODO: Implement remove logic
	if c.config.Pretty {
		_, _ = fmt.Fprintln(os.Stdout, "Cluster removed (placeholder)")
	}
	return nil
}

const (
	// ColumnName is the column name for the cluster name.
	ColumnName = "name"
	// ColumnServer is the column name for the cluster server.
	ColumnServer = "server"
)

// ListOptions holds options for listing clusters.
type ListOptions struct {
	NoHeaders bool
	Columns   []string
}

// List returns list of clusters
func (c *Clusters) List(ctx context.Context, opts ListOptions) error { // Prepare table headings.
	headings := []interface{}{ColumnName, ColumnServer}
	if len(opts.Columns) > 0 {
		headings = []interface{}{}
		for _, col := range opts.Columns {
			headings = append(headings, col)
		}
	}
	// Prepare table header.
	tbl := table.New(headings...)
	tbl.WithHeaderFormatter(func(format string, vals ...interface{}) string {
		if opts.NoHeaders { // Skip printing headers.
			return ""
		}
		// Otherwise print in all caps.
		return strings.ToUpper(fmt.Sprintf(format, vals...))
	})
	clusterList, err := c.clusterManager.List(ctx)
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	// Return a table row for the given account.
	row := func(cluster *clusters.Cluster) []any {
		var row []any
		for _, heading := range headings {
			switch heading {
			case ColumnName:
				row = append(row, cluster.Name)
			case ColumnServer:
				row = append(row, cluster.Server)
			default:
				c.l.Warnf("Unknown column '%s' for cluster listing", heading)
			}
		}
		return row
	}
	for _, cluster := range clusterList.Items {
		tbl.AddRow(row(&cluster)...)
	}
	tbl.Print()
	return nil
}
