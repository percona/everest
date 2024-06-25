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

// Package kubernetes provides functionality for kubernetes.
package kubernetes

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	goversion "github.com/hashicorp/go-version"
	olmv1 "github.com/operator-framework/api/pkg/operators/v1"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"go.uber.org/zap"
	yamlv3 "gopkg.in/yaml.v3"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
	everestVersion "github.com/percona/everest/pkg/version"
)

type (
	// ClusterType defines type of cluster.
	ClusterType string
)

const (
	// ClusterTypeUnknown is for unknown type.
	ClusterTypeUnknown ClusterType = "unknown"
	// ClusterTypeMinikube is for minikube.
	ClusterTypeMinikube ClusterType = "minikube"
	// ClusterTypeEKS is for EKS.
	ClusterTypeEKS ClusterType = "eks"
	// ClusterTypeGeneric is a generic type.
	ClusterTypeGeneric ClusterType = "generic"

	// EverestOperatorDeploymentName is the name of the deployment for everest operator.
	EverestOperatorDeploymentName = "everest-operator-controller-manager"

	// EverestDBNamespacesEnvVar is the name of the environment variable that
	// contains the list of monitored namespaces.
	EverestDBNamespacesEnvVar = "DB_NAMESPACES"

	pxcDeploymentName            = "percona-xtradb-cluster-operator"
	psmdbDeploymentName          = "percona-server-mongodb-operator"
	postgresDeploymentName       = "percona-postgresql-operator"
	psmdbOperatorContainerName   = "percona-server-mongodb-operator"
	pxcOperatorContainerName     = "percona-xtradb-cluster-operator"
	everestOperatorContainerName = "manager"
	databaseClusterKind          = "DatabaseCluster"
	databaseClusterAPIVersion    = "everest.percona.com/v1alpha1"
	managedByKey                 = "everest.percona.com/managed-by"

	// OLMNamespace is the namespace where OLM is installed.
	OLMNamespace    = "everest-olm"
	olmOperatorName = "olm-operator"

	// APIVersionCoreosV1 constant for some API requests.
	APIVersionCoreosV1 = "operators.coreos.com/v1"

	pollInterval = 1 * time.Second
	pollDuration = 300 * time.Second

	deploymentRestartAnnotation = "kubectl.kubernetes.io/restartedAt"
)

// ErrEmptyVersionTag Got an empty version tag from GitHub API.
var ErrEmptyVersionTag = errors.New("got an empty version tag from Github")

// Kubernetes is a client for Kubernetes.
type Kubernetes struct {
	client     client.KubeClientConnector
	l          *zap.SugaredLogger
	namespace  string
	httpClient *http.Client
	kubeconfig string
}

// NodeSummaryNode holds information about Node inside Node's summary.
type NodeSummaryNode struct {
	FileSystem NodeFileSystemSummary `json:"fs,omitempty"`
}

// NodeSummary holds summary of the Node.
// One gets this by requesting Kubernetes API endpoint:
// /v1/nodes/<node-name>/proxy/stats/summary.
type NodeSummary struct {
	Node NodeSummaryNode `json:"node,omitempty"`
}

// NodeFileSystemSummary holds a summary of Node's filesystem.
type NodeFileSystemSummary struct {
	UsedBytes uint64 `json:"usedBytes,omitempty"`
}

// New returns new Kubernetes object.
func New(kubeconfigPath string, l *zap.SugaredLogger) (*Kubernetes, error) {
	client, err := client.NewFromKubeConfig(kubeconfigPath, l)
	if err != nil {
		return nil, err
	}

	return &Kubernetes{
		client: client,
		l:      l.With("component", "kubernetes"),
		httpClient: &http.Client{
			Timeout: time.Second * 5,
			Transport: &http.Transport{
				MaxIdleConns:    1,
				IdleConnTimeout: 10 * time.Second,
			},
		},
		kubeconfig: kubeconfigPath,
	}, nil
}

// NewInCluster creates a new kubernetes client using incluster authentication.
func NewInCluster(l *zap.SugaredLogger) (*Kubernetes, error) {
	client, err := client.NewInCluster()
	if err != nil {
		return nil, err
	}
	return &Kubernetes{
		client:    client,
		l:         l,
		namespace: client.Namespace(),
	}, nil
}

// Config returns *rest.Config.
func (k *Kubernetes) Config() *rest.Config {
	return k.client.Config()
}

// NewEmpty returns new Kubernetes object.
func NewEmpty(l *zap.SugaredLogger) *Kubernetes {
	return &Kubernetes{
		client: &client.Client{},
		l:      l.With("component", "kubernetes"),
		httpClient: &http.Client{
			Timeout: time.Second * 5,
			Transport: &http.Transport{
				MaxIdleConns:    1,
				IdleConnTimeout: 10 * time.Second,
			},
		},
	}
}

// WithClient sets the client connector.
func (k *Kubernetes) WithClient(c client.KubeClientConnector) *Kubernetes {
	k.client = c
	return k
}

// Namespace returns the current namespace.
func (k *Kubernetes) Namespace() string {
	return k.namespace
}

// ClusterName returns the name of the k8s cluster.
func (k *Kubernetes) ClusterName() string {
	return k.client.ClusterName()
}

// GetDefaultStorageClassName returns first storageClassName from kubernetes cluster.
func (k *Kubernetes) GetDefaultStorageClassName(ctx context.Context) (string, error) {
	storageClasses, err := k.client.GetStorageClasses(ctx)
	if err != nil {
		return "", err
	}
	if len(storageClasses.Items) > 0 {
		return storageClasses.Items[0].Name, nil
	}
	return "", errors.New("no storage classes available")
}

// GetEverestID returns the ID of the namespace where everest is deployed.
func (k *Kubernetes) GetEverestID(ctx context.Context) (string, error) {
	namespace, err := k.client.GetNamespace(ctx, k.namespace)
	if err != nil {
		return "", err
	}
	return string(namespace.UID), nil
}

// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
func (k *Kubernetes) GetClusterType(ctx context.Context) (ClusterType, error) {
	storageClasses, err := k.client.GetStorageClasses(ctx)
	if err != nil {
		return ClusterTypeUnknown, err
	}
	for _, storageClass := range storageClasses.Items {
		if strings.Contains(storageClass.Provisioner, "aws") {
			return ClusterTypeEKS, nil
		}
		if strings.Contains(storageClass.Provisioner, "minikube") ||
			strings.Contains(storageClass.Provisioner, "kubevirt.io/hostpath-provisioner") ||
			strings.Contains(storageClass.Provisioner, "standard") {
			return ClusterTypeMinikube, nil
		}
	}
	return ClusterTypeGeneric, nil
}

// getOperatorVersion parses operator version from operator deployment.
func (k *Kubernetes) getOperatorVersion(ctx context.Context, deploymentName, containerName string) (string, error) {
	deployment, err := k.client.GetDeployment(ctx, deploymentName, "")
	if err != nil {
		return "", err
	}
	for _, container := range deployment.Spec.Template.Spec.Containers {
		if container.Name == containerName {
			return strings.Split(container.Image, ":")[1], nil
		}
	}
	return "", errors.New("unknown version of operator")
}

// GetPSMDBOperatorVersion parses PSMDB operator version from operator deployment.
func (k *Kubernetes) GetPSMDBOperatorVersion(ctx context.Context) (string, error) {
	return k.getOperatorVersion(ctx, psmdbDeploymentName, psmdbOperatorContainerName)
}

// GetPXCOperatorVersion parses PXC operator version from operator deployment.
func (k *Kubernetes) GetPXCOperatorVersion(ctx context.Context) (string, error) {
	return k.getOperatorVersion(ctx, pxcDeploymentName, pxcOperatorContainerName)
}

// GetDBaaSOperatorVersion parses DBaaS operator version from operator deployment.
func (k *Kubernetes) GetDBaaSOperatorVersion(ctx context.Context) (string, error) {
	return k.getOperatorVersion(ctx, EverestOperatorDeploymentName, everestOperatorContainerName)
}

// CreatePMMSecret creates pmm secret in kubernetes.
func (k *Kubernetes) CreatePMMSecret(namespace, secretName string, secrets map[string][]byte) error {
	secret := &corev1.Secret{ //nolint: exhaustruct
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Secret",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
		Type: corev1.SecretTypeOpaque,
		Data: secrets,
	}
	return k.client.ApplyObject(secret)
}

// CreateRestore creates a restore.
func (k *Kubernetes) CreateRestore(restore *everestv1alpha1.DatabaseClusterRestore) error {
	return k.client.ApplyObject(restore)
}

// GetLogs returns logs.
func (k *Kubernetes) GetLogs(
	ctx context.Context,
	containerStatuses []corev1.ContainerStatus,
	pod,
	container string,
) ([]string, error) {
	if IsContainerInState(containerStatuses, ContainerStateWaiting) {
		return []string{}, nil
	}

	stdout, err := k.client.GetLogs(ctx, pod, container)
	if err != nil {
		return nil, errors.Join(err, errors.New("couldn't get logs"))
	}

	if stdout == "" {
		return []string{}, nil
	}

	return strings.Split(stdout, "\n"), nil
}

// GetEvents returns pod's events as a slice of strings.
func (k *Kubernetes) GetEvents(ctx context.Context, pod string) ([]string, error) {
	stdout, err := k.client.GetEvents(ctx, pod)
	if err != nil {
		return nil, errors.Join(err, errors.New("couldn't describe pod"))
	}

	lines := strings.Split(stdout, "\n")

	return lines, nil
}

// InstallOLMOperator installs OLM operator.
func (k *Kubernetes) InstallOLMOperator(ctx context.Context, upgrade bool) error {
	deployment, err := k.client.GetDeployment(ctx, olmOperatorName, OLMNamespace)
	if err == nil && deployment != nil && deployment.ObjectMeta.Name != "" && !upgrade {
		k.l.Info("OLM operator is already installed")
		return nil // already installed
	}

	resources, err := k.applyResources(ctx)
	if err != nil {
		return err
	}

	if err := k.waitForDeploymentRollout(ctx); err != nil {
		return err
	}

	if err := k.applyCSVs(ctx, resources); err != nil {
		return err
	}

	if err := k.client.DoRolloutWait(ctx, types.NamespacedName{Namespace: OLMNamespace, Name: "packageserver"}); err != nil {
		return errors.Join(err, errors.New("error while waiting for deployment rollout"))
	}

	return nil
}

func (k *Kubernetes) applyCSVs(ctx context.Context, resources []unstructured.Unstructured) error {
	subscriptions := filterResources(resources, func(r unstructured.Unstructured) bool {
		return r.GroupVersionKind() == schema.GroupVersionKind{
			Group:   olmv1alpha1.GroupName,
			Version: olmv1alpha1.GroupVersion,
			Kind:    olmv1alpha1.SubscriptionKind,
		}
	})

	for _, sub := range subscriptions {
		subscriptionKey := types.NamespacedName{Namespace: sub.GetNamespace(), Name: sub.GetName()}
		log.Printf("Waiting for subscription/%s to install CSV", subscriptionKey.Name)
		csvKey, err := k.client.GetSubscriptionCSV(ctx, subscriptionKey)
		if err != nil {
			return fmt.Errorf("subscription/%s failed to install CSV: %w", subscriptionKey.Name, err)
		}
		log.Printf("Waiting for clusterserviceversion/%s to reach 'Succeeded' phase", csvKey.Name)
		if err := k.client.DoCSVWait(ctx, csvKey); err != nil {
			return fmt.Errorf("clusterserviceversion/%s failed to reach 'Succeeded' phase", csvKey.Name)
		}
	}

	return nil
}

// InstallPerconaCatalog installs percona catalog and ensures that packages are available.
func (k *Kubernetes) InstallPerconaCatalog(ctx context.Context, version *goversion.Version) error {
	if version == nil {
		return errors.New("no version provided for Percona catalog installation")
	}

	data, err := fs.ReadFile(data.OLMCRDs, "crds/olm/everest-catalog.yaml")
	if err != nil {
		return errors.Join(err, errors.New("failed to read percona catalog file"))
	}
	o := make(map[string]interface{})
	if err := yamlv3.Unmarshal(data, &o); err != nil {
		return err
	}

	k.l.Debugf("Using catalog image %s", everestVersion.CatalogImage(version))
	if err := unstructured.SetNestedField(o, everestVersion.CatalogImage(version), "spec", "image"); err != nil {
		return err
	}
	data, err = yamlv3.Marshal(o)
	if err != nil {
		return err
	}

	if err := k.client.ApplyFile(data); err != nil {
		return errors.Join(err, errors.New("cannot apply percona catalog file"))
	}
	if err := k.client.DoPackageWait(ctx, OLMNamespace, "everest-operator"); err != nil {
		return errors.Join(err, errors.New("timeout waiting for package"))
	}
	return nil
}

func (k *Kubernetes) applyResources(ctx context.Context) ([]unstructured.Unstructured, error) {
	files := []string{
		"crds/olm/crds.yaml",
		"crds/olm/olm.yaml",
	}

	resources := []unstructured.Unstructured{}
	for _, f := range files {
		data, err := fs.ReadFile(data.OLMCRDs, f)
		if err != nil {
			return nil, errors.Join(err, fmt.Errorf("failed to read %q file", f))
		}

		applyFile := func(context.Context) (bool, error) {
			k.l.Debugf("Applying %q file", f)
			if err := k.client.ApplyFile(data); err != nil {
				k.l.Debug(errors.Join(err, fmt.Errorf("cannot apply %q file", f)))
				k.l.Warn(fmt.Errorf("cannot apply %q file. Reapplying it", f))
				return false, nil
			}
			return true, nil
		}

		if err := wait.PollUntilContextTimeout(ctx, time.Second, 10*time.Minute, true, applyFile); err != nil {
			return nil, errors.Join(err, fmt.Errorf("cannot apply %q file", f))
		}

		r, err := decodeResources(data)
		if err != nil {
			return nil, errors.Join(err, fmt.Errorf("cannot decode resources in %q", f))
		}
		resources = append(resources, r...)
	}

	return resources, nil
}

func (k *Kubernetes) waitForDeploymentRollout(ctx context.Context) error {
	if err := k.client.DoRolloutWait(ctx, types.NamespacedName{
		Namespace: OLMNamespace,
		Name:      olmOperatorName,
	}); err != nil {
		return errors.Join(err, errors.New("error while waiting for deployment rollout"))
	}
	if err := k.client.DoRolloutWait(ctx, types.NamespacedName{Namespace: OLMNamespace, Name: "catalog-operator"}); err != nil {
		return errors.Join(err, errors.New("error while waiting for deployment rollout"))
	}

	return nil
}

func decodeResources(f []byte) ([]unstructured.Unstructured, error) {
	var err error
	objs := []unstructured.Unstructured{}
	dec := yaml.NewYAMLOrJSONDecoder(bytes.NewReader(f), 8)
	for {
		var u unstructured.Unstructured
		err = dec.Decode(&u)
		if errors.Is(err, io.EOF) {
			break
		} else if err != nil {
			return nil, err
		}
		objs = append(objs, u)
	}

	return objs, nil
}

func filterResources(resources []unstructured.Unstructured, filter func(unstructured.
	Unstructured) bool,
) []unstructured.Unstructured {
	filtered := make([]unstructured.Unstructured, 0, len(resources))
	for _, r := range resources {
		if filter(r) {
			filtered = append(filtered, r)
		}
	}
	return filtered
}

// InstallOperatorRequest holds the fields to make an operator install request.
type InstallOperatorRequest struct {
	Namespace              string
	Name                   string
	OperatorGroup          string
	CatalogSource          string
	CatalogSourceNamespace string
	Channel                string
	InstallPlanApproval    olmv1alpha1.Approval
	StartingCSV            string
	TargetNamespaces       []string
	SubscriptionConfig     *olmv1alpha1.SubscriptionConfig
}

func mergeNamespacesEnvVar(str1, str2 string) string {
	ns1 := strings.Split(str1, ",")
	ns2 := strings.Split(str2, ",")
	nsMap := make(map[string]struct{})

	for _, ns := range ns1 {
		if ns == "" {
			continue
		}
		nsMap[ns] = struct{}{}
	}

	for _, ns := range ns2 {
		if ns == "" {
			continue
		}
		nsMap[ns] = struct{}{}
	}

	namespaces := []string{}
	for ns := range nsMap {
		namespaces = append(namespaces, ns)
	}

	sort.Strings(namespaces)

	return strings.Join(namespaces, ",")
}

func mergeSubscriptionConfig(sub *olmv1alpha1.SubscriptionConfig, cfg *olmv1alpha1.SubscriptionConfig) *olmv1alpha1.SubscriptionConfig {
	if sub == nil {
		sub = &olmv1alpha1.SubscriptionConfig{Env: []corev1.EnvVar{}}
	}

	if cfg == nil {
		return sub
	}

	for _, e := range cfg.Env {
		found := false
		for i, se := range sub.Env {
			if e.Name == se.Name {
				found = true
				// If the environment variable is not the namespaces, just override it
				if e.Name != EverestDBNamespacesEnvVar {
					sub.Env[i].Value = e.Value
					break
				}

				// Merge the namespaces
				sub.Env[i].Value = mergeNamespacesEnvVar(se.Value, e.Value)

				break
			}
		}
		if !found {
			sub.Env = append(sub.Env, e)
		}
	}

	return sub
}

func (k *Kubernetes) getTargetInstallPlanName(ctx context.Context, subscription *olmv1alpha1.Subscription, req InstallOperatorRequest) (string, error) {
	targetCSV := req.StartingCSV
	if subscription.Status.InstalledCSV != "" {
		targetCSV = subscription.Status.InstalledCSV
	}
	if targetCSV == "" {
		// We don't know yet which CSV we want, so we will use the one specified in the subscription.
		return subscription.Status.InstallPlanRef.Name, nil
	}
	ipList, err := k.client.ListInstallPlans(ctx, req.Namespace)
	if err != nil {
		return "", err
	}
	for _, ip := range ipList.Items {
		for _, csv := range ip.Spec.ClusterServiceVersionNames {
			if csv == targetCSV {
				return ip.GetName(), nil
			}
		}
	}
	return "", fmt.Errorf("cannot find InstallPlan for CSV: %s", targetCSV)
}

// InstallOperator installs an operator via OLM.
func (k *Kubernetes) InstallOperator(ctx context.Context, req InstallOperatorRequest) error { //nolint:funlen
	subscription, err := k.client.GetSubscription(ctx, req.Namespace, req.Name)
	if err != nil && !apierrors.IsNotFound(err) {
		return errors.Join(err, errors.New("cannot get subscription"))
	}
	if apierrors.IsNotFound(err) {
		subscription = &olmv1alpha1.Subscription{
			TypeMeta: metav1.TypeMeta{
				Kind:       olmv1alpha1.SubscriptionKind,
				APIVersion: olmv1alpha1.SubscriptionCRDAPIVersion,
			},
			ObjectMeta: metav1.ObjectMeta{
				Namespace: req.Namespace,
				Name:      req.Name,
			},
			Spec: &olmv1alpha1.SubscriptionSpec{
				CatalogSource:          req.CatalogSource,
				CatalogSourceNamespace: req.CatalogSourceNamespace,
				Package:                req.Name,
				Channel:                req.Channel,
				StartingCSV:            req.StartingCSV,
				InstallPlanApproval:    req.InstallPlanApproval,
			},
		}
	}

	subscription.Spec.Config = mergeSubscriptionConfig(subscription.Spec.Config, req.SubscriptionConfig)
	if apierrors.IsNotFound(err) {
		_, err := k.client.CreateSubscription(ctx, req.Namespace, subscription)
		if err != nil {
			return errors.Join(err, errors.New("cannot create a subscription to install the operator"))
		}
	} else {
		_, err := k.client.UpdateSubscription(ctx, req.Namespace, subscription)
		if err != nil {
			return errors.Join(err, errors.New("cannot update a subscription to install the operator"))
		}
	}

	err = wait.PollUntilContextTimeout(ctx, pollInterval, pollDuration, false, func(ctx context.Context) (bool, error) {
		k.l.Debugf("Polling subscription %s/%s", req.Namespace, req.Name)
		subs, err := k.client.GetSubscription(ctx, req.Namespace, req.Name)
		if err != nil {
			return false, errors.Join(err, fmt.Errorf("cannot get an install plan for the operator subscription: %q", req.Name))
		}
		if subs == nil || subs.Status.InstallPlanRef == nil {
			return false, nil
		}

		installPlanName, err := k.getTargetInstallPlanName(ctx, subs, req)
		if err != nil {
			return false, err
		}
		return k.ApproveInstallPlan(ctx, req.Namespace, installPlanName)
	})
	if err != nil {
		return err
	}
	deploymentName := req.Name
	if req.Name == "everest-operator" {
		deploymentName = EverestOperatorDeploymentName
	}
	if req.Name == "victoriametrics-operator" {
		deploymentName = "vm-operator-vm-operator"
	}

	k.l.Debugf("Waiting for deployment rollout %s/%s", req.Namespace, deploymentName)

	return k.client.DoRolloutWait(ctx, types.NamespacedName{Namespace: req.Namespace, Name: deploymentName})
}

// CreateOperatorGroup creates operator group in the given namespace.
func (k *Kubernetes) CreateOperatorGroup(ctx context.Context, name, namespace string, targetNamespaces []string) error {
	targetNamespaces = append(targetNamespaces, namespace)
	og, err := k.client.GetOperatorGroup(ctx, namespace, name)
	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}
	if err != nil && apierrors.IsNotFound(err) {
		_, err = k.client.CreateOperatorGroup(ctx, namespace, name, targetNamespaces)
		if err != nil {
			return err
		}
		return nil
	}
	og.Kind = olmv1.OperatorGroupKind
	og.APIVersion = "operators.coreos.com/v1"
	var update bool
	for _, namespace := range targetNamespaces {
		if !arrayContains(og.Spec.TargetNamespaces, namespace) {
			update = true
		}
	}
	if update {
		og.Spec.TargetNamespaces = targetNamespaces
		return k.client.ApplyObject(og)
	}
	return nil
}

// ListSubscriptions all the subscriptions in the namespace.
func (k *Kubernetes) ListSubscriptions(ctx context.Context, namespace string) (*olmv1alpha1.SubscriptionList, error) {
	return k.client.ListSubscriptions(ctx, namespace)
}

// UpgradeOperator upgrades an operator to the next available version.
func (k *Kubernetes) UpgradeOperator(ctx context.Context, namespace, name string) error {
	ip, err := k.getInstallPlanFromSubscription(ctx, namespace, name)
	if err != nil {
		return err
	}

	if ip.Spec.Approved {
		return nil // There are no upgrades.
	}

	ip.Spec.Approved = true

	_, err = k.client.UpdateInstallPlan(ctx, namespace, ip)

	return err
}

// GetServerVersion returns server version.
func (k *Kubernetes) GetServerVersion() (*version.Info, error) {
	return k.client.GetServerVersion()
}

// GetClusterServiceVersion retrieves a ClusterServiceVersion by namespaced name.
func (k *Kubernetes) GetClusterServiceVersion(
	ctx context.Context,
	key types.NamespacedName,
) (*olmv1alpha1.ClusterServiceVersion, error) {
	return k.client.GetClusterServiceVersion(ctx, key)
}

// ListClusterServiceVersion list all CSVs for the given namespace.
func (k *Kubernetes) ListClusterServiceVersion(
	ctx context.Context,
	namespace string,
) (*olmv1alpha1.ClusterServiceVersionList, error) {
	return k.client.ListClusterServiceVersion(ctx, namespace)
}

// UpdateClusterServiceVersion updates a ClusterServiceVersion and returns the updated object.
func (k *Kubernetes) UpdateClusterServiceVersion(
	ctx context.Context,
	csv *olmv1alpha1.ClusterServiceVersion,
) (*olmv1alpha1.ClusterServiceVersion, error) {
	return k.client.UpdateClusterServiceVersion(ctx, csv)
}

// DeleteClusterServiceVersion deletes a ClusterServiceVersion.
func (k *Kubernetes) DeleteClusterServiceVersion(
	ctx context.Context,
	key types.NamespacedName,
) error {
	return k.client.DeleteClusterServiceVersion(ctx, key)
}

// DeleteObject deletes an object.
func (k *Kubernetes) DeleteObject(obj runtime.Object) error {
	return k.client.DeleteObject(obj)
}

// ProvisionMonitoring provisions PMM monitoring.
func (k *Kubernetes) ProvisionMonitoring(namespace string) error {
	for _, path := range k.victoriaMetricsCRDFiles() {
		file, err := data.OLMCRDs.ReadFile(path)
		if err != nil {
			return err
		}
		// retry 3 times because applying vmagent spec might take some time.
		for range 3 {
			k.l.Debugf("Applying file %s", path)

			err = k.client.ApplyManifestFile(file, namespace)
			if err != nil {
				k.l.Debugf("%s: retrying after error: %s", path, err)
				time.Sleep(10 * time.Second)
				continue
			}
			break
		}
		if err != nil {
			return errors.Join(err, fmt.Errorf("cannot apply file: %q", path))
		}
	}

	return nil
}

func (k *Kubernetes) victoriaMetricsCRDFiles() []string {
	return []string{
		"crds/victoriametrics/crs/vmagent_rbac_account.yaml",
		"crds/victoriametrics/crs/vmagent_rbac_role.yaml",
		"crds/victoriametrics/crs/vmagent_rbac_role_binding.yaml",
		"crds/victoriametrics/crs/vmnodescrape-cadvisor.yaml",
		"crds/victoriametrics/crs/vmnodescrape-kubelet.yaml",
		"crds/victoriametrics/crs/vmpodscrape.yaml",
		"crds/victoriametrics/kube-state-metrics/service-account.yaml",
		"crds/victoriametrics/kube-state-metrics/cluster-role.yaml",
		"crds/victoriametrics/kube-state-metrics/cluster-role-binding.yaml",
		"crds/victoriametrics/kube-state-metrics/configmap.yaml",
		"crds/victoriametrics/kube-state-metrics/deployment.yaml",
		"crds/victoriametrics/kube-state-metrics/service.yaml",
		"crds/victoriametrics/kube-state-metrics.yaml",
	}
}

// RestartOperator restarts the deployment of an operator managed by OLM.
//
//nolint:funlen
func (k *Kubernetes) RestartOperator(ctx context.Context, name, namespace string) error {
	// Get the deployment.
	deployment, err := k.GetDeployment(ctx, name, namespace)
	if err != nil {
		return err
	}
	// Find the CSV which owns the deployment.
	ownerCsvIdx := slices.IndexFunc(deployment.GetOwnerReferences(), func(owner metav1.OwnerReference) bool {
		return owner.Kind == olmv1alpha1.ClusterServiceVersionKind
	})
	if ownerCsvIdx < 0 {
		return fmt.Errorf("cannot find ClusterServiceVersion owner for deployment %s in namespace %s", name, namespace)
	}

	now := time.Now().Truncate(time.Second)
	// Find the operator CSV and add the restart annotation.
	// We retry this operatation since there may be update conflicts.
	var b backoff.BackOff
	b = backoff.NewConstantBackOff(3 * time.Second)
	b = backoff.WithMaxRetries(b, 5)
	b = backoff.WithContext(b, ctx)
	if err := backoff.Retry(func() error {
		csv, err := k.client.GetClusterServiceVersion(ctx, types.NamespacedName{
			Name:      deployment.GetOwnerReferences()[ownerCsvIdx].Name,
			Namespace: namespace,
		})
		if err != nil {
			return err
		}
		// Update restart annotation.
		annotations := csv.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}
		now = time.Now().Truncate(time.Second)
		annotations[deploymentRestartAnnotation] = now.Format(time.RFC3339)
		csv.SetAnnotations(annotations)
		if _, err = k.client.UpdateClusterServiceVersion(ctx, csv); err != nil {
			return err
		}
		return nil
	}, b,
	); err != nil {
		return errors.Join(err, errors.New("cannot update ClusterServiceVersion with restart annotation"))
	}

	// Wait for pods to be ready.
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, true, func(ctx context.Context) (bool, error) {
		deployment, err := k.GetDeployment(ctx, name, namespace)
		if err != nil {
			return false, err
		}
		val, found := deployment.Spec.Template.GetAnnotations()[deploymentRestartAnnotation]
		if !found {
			return false, nil
		}
		observedRestartTS, err := time.Parse(time.RFC3339, val)
		if err != nil {
			return false, err
		}
		ready := deployment.Status.ReadyReplicas == deployment.Status.Replicas &&
			deployment.Status.Replicas == deployment.Status.UpdatedReplicas &&
			deployment.Status.UnavailableReplicas == 0 &&
			deployment.GetGeneration() == deployment.Status.ObservedGeneration &&
			// The last restart cannot be older than now.
			(observedRestartTS.After(now) || observedRestartTS.Equal(now))

		return ready, nil
	})
}

// RestartDeployment restarts the given deployment.
func (k *Kubernetes) RestartDeployment(ctx context.Context, name, namespace string) error {
	// Get the Deployment and add restart annotation to pod template.
	// We retry this operatation since there may be update conflicts.
	var b backoff.BackOff
	b = backoff.NewConstantBackOff(3 * time.Second)
	b = backoff.WithMaxRetries(b, 5)
	b = backoff.WithContext(b, ctx)
	if err := backoff.Retry(func() error {
		// Get the deployment.
		deployment, err := k.GetDeployment(ctx, name, namespace)
		if err != nil {
			return err
		}
		// Set restart annotation.
		annotations := deployment.Spec.Template.Annotations
		if annotations == nil {
			annotations = make(map[string]string)
		}
		annotations[deploymentRestartAnnotation] = time.Now().Format(time.RFC3339)
		deployment.Spec.Template.SetAnnotations(annotations)
		// Update deployment.
		if _, err := k.client.UpdateDeployment(ctx, deployment); err != nil {
			return err
		}
		return nil
	}, b,
	); err != nil {
		return errors.Join(err, errors.New("cannot add restart annotation to deployment"))
	}
	// Wait for pods to be ready.
	return wait.PollUntilContextTimeout(ctx, 5*time.Second, 5*time.Minute, true, func(ctx context.Context) (bool, error) {
		deployment, err := k.GetDeployment(ctx, name, namespace)
		if err != nil {
			return false, err
		}
		ready := deployment.Status.ReadyReplicas == deployment.Status.Replicas &&
			deployment.Status.Replicas == deployment.Status.UpdatedReplicas &&
			deployment.Status.UnavailableReplicas == 0 &&
			deployment.GetGeneration() == deployment.Status.ObservedGeneration

		return ready, nil
	})
}

// ListEngineDeploymentNames returns a string array containing found engine deployments for the Everest.
func (k *Kubernetes) ListEngineDeploymentNames(ctx context.Context, namespace string) ([]string, error) {
	names := []string{}
	deploymentList, err := k.client.ListDeployments(ctx, namespace)
	if err != nil {
		return names, err
	}
	for _, deployment := range deploymentList.Items {
		switch deployment.Name {
		case pxcDeploymentName, psmdbDeploymentName, postgresDeploymentName:
			names = append(names, deployment.Name)
		}
	}
	return names, nil
}

// ApplyObject applies object.
func (k *Kubernetes) ApplyObject(obj runtime.Object) error {
	return k.client.ApplyObject(obj)
}

// InstallEverest downloads the manifest file and applies it against provisioned k8s cluster.
func (k *Kubernetes) InstallEverest(
	ctx context.Context,
	namespace string,
	version *goversion.Version,
	skipObjs ...ctrlclient.Object,
) error {
	if version == nil {
		return errors.New("no version provided for Everest installation")
	}

	data, err := k.getManifestData(ctx, version)
	if err != nil {
		return errors.Join(err, errors.New("failed reading everest manifest file"))
	}

	k.l.Debug("Applying manifest file")
	err = k.client.ApplyManifestFile(data, namespace, skipObjs...)
	if err != nil {
		return errors.Join(err, errors.New("failed applying manifest file"))
	}

	k.l.Debug("Waiting for manifest rollout")
	if err := k.client.DoRolloutWait(ctx, types.NamespacedName{Name: common.PerconaEverestDeploymentName, Namespace: namespace}); err != nil {
		return errors.Join(err, errors.New("failed waiting for the Everest deployment to be ready"))
	}
	return nil
}

func (k *Kubernetes) getManifestData(ctx context.Context, version *goversion.Version) ([]byte, error) {
	m := everestVersion.ManifestURL(version)
	k.l.Debugf("Downloading manifest file %s", m)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck
	return io.ReadAll(resp.Body)
}

// DeleteEverest downloads the manifest file and deletes it from provisioned k8s cluster.
func (k *Kubernetes) DeleteEverest(ctx context.Context, namespace string, version *goversion.Version) error {
	data, err := k.getManifestData(ctx, version)
	if err != nil {
		return errors.Join(err, errors.New("failed downloading Everest manifest file"))
	}

	err = k.client.DeleteManifestFile(data, namespace)
	if err != nil {
		return errors.Join(err, errors.New("failed deleting Everest based on a manifest file"))
	}
	return nil
}

// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
func (k *Kubernetes) GetDBNamespaces(ctx context.Context, namespace string) ([]string, error) {
	deployment, err := k.GetDeployment(ctx, EverestOperatorDeploymentName, namespace)
	if err != nil {
		// If the operator is not found, we assume that no namespaces are being watched.
		if apierrors.IsNotFound(err) {
			return []string{}, nil
		}
		return nil, err
	}

	for _, container := range deployment.Spec.Template.Spec.Containers {
		if container.Name != everestOperatorContainerName {
			continue
		}
		for _, envVar := range container.Env {
			if envVar.Name != EverestDBNamespacesEnvVar {
				continue
			}
			return strings.Split(envVar.Value, ","), nil
		}
	}

	return nil, errors.New("failed to get watched namespaces")
}

// WaitForRollout waits for rollout of a provided deployment in the provided namespace.
func (k *Kubernetes) WaitForRollout(ctx context.Context, name, namespace string) error {
	return k.client.DoRolloutWait(ctx, types.NamespacedName{Name: name, Namespace: namespace})
}

// UpdateClusterRoleBinding updates namespaces list for the cluster role by provided name.
func (k *Kubernetes) UpdateClusterRoleBinding(ctx context.Context, name string, namespaces []string) error {
	binding, err := k.client.GetClusterRoleBinding(ctx, name)
	if err != nil {
		return err
	}
	if len(binding.Subjects) == 0 {
		return fmt.Errorf("no subjects available for the cluster role binding %s", name)
	}
	var needsUpdate bool
	for _, namespace := range namespaces {
		if !subjectsContains(binding.Subjects, namespace) {
			subject := binding.Subjects[0]
			subject.Namespace = namespace
			binding.Subjects = append(binding.Subjects, subject)
			needsUpdate = true
		}
	}
	if needsUpdate {
		binding.Kind = "ClusterRoleBinding"
		binding.APIVersion = "rbac.authorization.k8s.io/v1"
		return k.client.ApplyObject(binding)
	}

	return nil
}

func arrayContains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func subjectsContains(s []rbacv1.Subject, n string) bool {
	for _, a := range s {
		if a.Namespace == n {
			return true
		}
	}
	return false
}
