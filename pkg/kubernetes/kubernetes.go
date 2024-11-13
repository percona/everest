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
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes/client"
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
	// ClusterTypeGKE is for GKE.
	ClusterTypeGKE ClusterType = "gke"
	// ClusterTypeOpenShift is for OpenShift.
	ClusterTypeOpenShift ClusterType = "openshift"
	// ClusterTypeGeneric is a generic type.
	ClusterTypeGeneric ClusterType = "generic"

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

	pollInterval = 5 * time.Second
	pollTimeout  = 15 * time.Minute

	deploymentRestartAnnotation = "kubectl.kubernetes.io/restartedAt"

	backoffInterval   = 5 * time.Second
	backoffMaxRetries = 5

	requestTimeout  = 5 * time.Second
	maxIdleConns    = 1
	idleConnTimeout = 10 * time.Second
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
			Timeout: requestTimeout,
			Transport: &http.Transport{
				MaxIdleConns:    maxIdleConns,
				IdleConnTimeout: idleConnTimeout,
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
			Timeout: requestTimeout,
			Transport: &http.Transport{
				MaxIdleConns:    maxIdleConns,
				IdleConnTimeout: idleConnTimeout,
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

// GetEverestID returns the ID of the namespace where everest is deployed.
func (k *Kubernetes) GetEverestID(ctx context.Context) (string, error) {
	namespace, err := k.client.GetNamespace(ctx, k.namespace)
	if err != nil {
		return "", err
	}
	return string(namespace.UID), nil
}

func (k *Kubernetes) isOpenshift(ctx context.Context) (bool, error) {
	crds, err := k.client.ListCRDs(ctx, &metav1.LabelSelector{})
	if err != nil {
		return false, err
	}
	return slices.ContainsFunc(crds.Items, func(crd apiextv1.CustomResourceDefinition) bool {
		return strings.Contains(crd.Spec.Group, "openshift")
	}), nil
}

// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
func (k *Kubernetes) GetClusterType(ctx context.Context) (ClusterType, error) {
	if ok, err := k.isOpenshift(ctx); err != nil {
		return ClusterTypeUnknown, err
	} else if ok {
		return ClusterTypeOpenShift, nil
	}

	// For other types, we will check the storage classes.
	storageClasses, err := k.client.GetStorageClasses(ctx)
	if err != nil {
		return ClusterTypeUnknown, err
	}
	for _, storageClass := range storageClasses.Items {
		if strings.Contains(storageClass.Provisioner, "aws") {
			return ClusterTypeEKS, nil
		}
		if strings.Contains(storageClass.Provisioner, "gke") {
			return ClusterTypeGKE, nil
		}
		if strings.Contains(storageClass.Provisioner, "minikube") ||
			strings.Contains(storageClass.Provisioner, "kubevirt.io/hostpath-provisioner") ||
			strings.Contains(storageClass.Provisioner, "standard") {
			return ClusterTypeMinikube, nil
		}
	}
	return ClusterTypeGeneric, nil
}

// GetCatalogSource returns catalog source.
func (k *Kubernetes) GetCatalogSource(ctx context.Context, name, namespace string) (*olmv1alpha1.CatalogSource, error) {
	return k.client.OLM().OperatorsV1alpha1().CatalogSources(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetSubscription returns subscription.
func (k *Kubernetes) GetSubscription(ctx context.Context, name, namespace string) (*olmv1alpha1.Subscription, error) {
	return k.client.OLM().OperatorsV1alpha1().Subscriptions(namespace).Get(ctx, name, metav1.GetOptions{})
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
			// If the CSV is the one we are looking for and the InstallPlan is
			// waiting for approval, we return it.
			// We introduced this phase check because OLM has a bug where it
			// sometimes creates duplicate InstallPlans for the same CSV and we
			// found a few cases where the duplicate InstallPlan wasn't
			// reconciled correctly and abandoned by OLM. This abandoned
			// InstallPlan was missing the status field meaning it was also
			// missing the necessary plan to install the operator. Approving
			// this InstallPlan would cause the operator to never be installed.
			// By checking the phase we make sure we will be approving an
			// InstallPlan that is actually ready to be approved.
			// See https://github.com/operator-framework/kubectl-operator/issues/13
			// for more details on a similar issue.
			// We also need to return the InstallPlan if the Phase is Complete
			// to ensure the idempotency of the InstallOperator function.
			if csv == targetCSV && (ip.Status.Phase == olmv1alpha1.InstallPlanPhaseRequiresApproval || ip.Status.Phase == olmv1alpha1.InstallPlanPhaseComplete) {
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
		if err := backoff.Retry(func() error {
			_, err := k.client.UpdateSubscription(ctx, req.Namespace, subscription)
			return err
		}, backoff.WithContext(backoff.NewConstantBackOff(backoffInterval), ctx)); err != nil {
			return errors.Join(err, errors.New("cannot update a subscription to install the operator"))
		}
	}

	err = wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
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
	if req.Name == "victoriametrics-operator" {
		deploymentName = "vm-operator-vm-operator"
	}

	k.l.Debugf("Waiting for deployment rollout %s/%s", req.Namespace, deploymentName)

	return k.client.DoRolloutWait(ctx, types.NamespacedName{Namespace: req.Namespace, Name: deploymentName})
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

// DeleteClusterServiceVersion deletes a ClusterServiceVersion.
func (k *Kubernetes) DeleteClusterServiceVersion(
	ctx context.Context,
	key types.NamespacedName,
) error {
	return k.client.DeleteClusterServiceVersion(ctx, key)
}

// DeleteSubscription deletes a subscription by namespaced name.
func (k *Kubernetes) DeleteSubscription(
	ctx context.Context,
	key types.NamespacedName,
) error {
	return k.client.DeleteSubscription(ctx, key)
}

// RestartDeployment restarts the given deployment.
func (k *Kubernetes) RestartDeployment(ctx context.Context, name, namespace string) error {
	// Get the Deployment and add restart annotation to pod template.
	// We retry this operatation since there may be update conflicts.
	var b backoff.BackOff
	b = backoff.NewConstantBackOff(backoffInterval)
	b = backoff.WithMaxRetries(b, backoffMaxRetries)
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
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
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

// ApplyManifestFile accepts manifest file contents, parses into []runtime.Object
// and applies them against the cluster.
func (k *Kubernetes) ApplyManifestFile(files []byte, namespace string) error {
	return k.client.ApplyManifestFile(files, namespace)
}

// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
func (k *Kubernetes) GetDBNamespaces(ctx context.Context) ([]string, error) {
	// List all namespaces managed by everest.
	namespaceList, err := k.ListNamespaces(ctx, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				common.KubernetesManagedByLabel: common.Everest,
			},
		}),
	})
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get watched namespaces"))
	}
	internalNs := []string{common.SystemNamespace, common.MonitoringNamespace}
	result := make([]string, 0, len(namespaceList.Items))
	for _, ns := range namespaceList.Items {
		if slices.Contains(internalNs, ns.GetName()) {
			continue
		}
		result = append(result, ns.GetName())
	}
	return result, nil
}

// WaitForRollout waits for rollout of a provided deployment in the provided namespace.
func (k *Kubernetes) WaitForRollout(ctx context.Context, name, namespace string) error {
	return k.client.DoRolloutWait(ctx, types.NamespacedName{Name: name, Namespace: namespace})
}

// DeleteManifestFile accepts manifest file contents, parses into []runtime.Object
// and deletes them from the cluster.
func (k *Kubernetes) DeleteManifestFile(fileBytes []byte, namespace string) error {
	return k.client.DeleteManifestFile(fileBytes, namespace)
}
