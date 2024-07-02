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

// Package client provides a way to communicate with a k8s cluster.
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"slices"
	"sort"
	"strings"
	"sync"
	"text/tabwriter"
	"time"

	v1 "github.com/operator-framework/api/pkg/operators/v1"
	"github.com/operator-framework/api/pkg/operators/v1alpha1"
	olmVersioned "github.com/operator-framework/operator-lifecycle-manager/pkg/api/client/clientset/versioned"
	packagev1 "github.com/operator-framework/operator-lifecycle-manager/pkg/package-server/apis/operators/v1"
	packageServerClient "github.com/operator-framework/operator-lifecycle-manager/pkg/package-server/client/clientset/versioned"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apiextv1clientset "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	yamlSerializer "k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/duration"
	"k8s.io/apimachinery/pkg/util/wait"
	yamlutil "k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/cli-runtime/pkg/resource"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/kubernetes/scheme"
	corev1client "k8s.io/client-go/kubernetes/typed/core/v1"
	_ "k8s.io/client-go/plugin/pkg/client/auth" // load all auth plugins
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/reference"
	deploymentutil "k8s.io/kubectl/pkg/util/deployment"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/apiutil"

	"github.com/percona/everest/pkg/kubernetes/client/customresources"
)

const (
	configKind  = "Config"
	apiVersion  = "v1"
	defaultName = "default"

	defaultQPSLimit   = 100
	defaultBurstLimit = 150
	defaultChunkSize  = 500

	defaultAPIURIPath  = "/api"
	defaultAPIsURIPath = "/apis"
)

// Each level has 2 spaces for PrefixWriter.
const (
	LEVEL0 = iota
	LEVEL1
	LEVEL2
	LEVEL3
	LEVEL4
)

// Client is the internal client for Kubernetes.
type Client struct {
	l *zap.SugaredLogger

	clientset        kubernetes.Interface
	customClientSet  *customresources.Client
	apiextClientset  apiextv1clientset.Interface
	dynamicClientset dynamic.Interface
	olmClientset     olmVersioned.Interface
	rcLock           *sync.Mutex
	restConfig       *rest.Config
	namespace        string
	clusterName      string
}

// SortableEvents implements sort.Interface for []api.Event based on the Timestamp field.
type SortableEvents []corev1.Event

func (list SortableEvents) Len() int {
	return len(list)
}

func (list SortableEvents) Swap(i, j int) {
	list[i], list[j] = list[j], list[i]
}

func (list SortableEvents) Less(i, j int) bool {
	return list[i].LastTimestamp.Time.Before(list[j].LastTimestamp.Time)
}

type resourceError struct {
	name  string
	issue string
}

type podError struct {
	resourceError
}

type deploymentError struct {
	resourceError
	podErrs podErrors
}

type (
	deploymentErrors []deploymentError
	podErrors        []podError
)

func (e deploymentErrors) Error() string {
	var sb strings.Builder
	for _, i := range e {
		sb.WriteString(fmt.Sprintf("deployment %s has error: %s\n%s", i.name, i.issue, i.podErrs.Error()))
	}
	return sb.String()
}

func (e podErrors) Error() string {
	var sb strings.Builder
	for _, i := range e {
		sb.WriteString(fmt.Sprintf("\tpod %s has error: %s\n", i.name, i.issue))
	}
	return sb.String()
}

// NewFromKubeConfig returns new Client from path to a kubeconfig.
func NewFromKubeConfig(kubeconfig string, l *zap.SugaredLogger) (*Client, error) {
	home := os.Getenv("HOME")
	path := strings.ReplaceAll(kubeconfig, "~", home)
	fileData, err := os.ReadFile(path) //nolint:gosec
	if err != nil {
		return nil, errors.Join(err, errors.New("could not read kubeconfig file"))
	}

	clientConfig, err := clientcmd.Load(fileData)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not parse kubeconfig file"))
	}

	config, err := clientcmd.RESTConfigFromKubeConfig(fileData)
	if err != nil {
		return nil, err
	}

	config.QPS = defaultQPSLimit
	config.Burst = defaultBurstLimit
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	apiextClientset, err := apiextv1clientset.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	dynamicClientset, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	olmClientset, err := olmVersioned.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	c := &Client{
		l:                l,
		clientset:        clientset,
		apiextClientset:  apiextClientset,
		dynamicClientset: dynamicClientset,
		olmClientset:     olmClientset,
		restConfig:       config,
		rcLock:           &sync.Mutex{},
		clusterName:      clientConfig.Contexts[clientConfig.CurrentContext].Cluster,
	}
	err = c.setup()
	return c, err
}

func (c *Client) setup() error {
	namespace := "default"
	if space := os.Getenv("NAMESPACE"); space != "" {
		namespace = space
	}
	c.namespace = namespace
	return c.initOperatorClients()
}

// NewInCluster creates a client using incluster authentication.
func NewInCluster() (*Client, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, err
	}
	config.QPS = defaultQPSLimit
	config.Burst = defaultBurstLimit
	config.Timeout = 10 * time.Second
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	namespace, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
	if err != nil {
		return nil, err
	}

	olmClientset, err := olmVersioned.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	c := &Client{
		clientset:    clientset,
		olmClientset: olmClientset,
		restConfig:   config,
		namespace:    string(namespace),
	}

	err = c.initOperatorClients()
	return c, err
}

// NewFromFakeClient returns a Client with a fake (in-memory) clientset.
// This is used only for unit testing.
func NewFromFakeClient() *Client {
	return &Client{
		clientset: fake.NewSimpleClientset(),
	}
}

func (c *Client) kubeClient() (client.Client, error) { //nolint:ireturn,nolintlint
	rcl, err := rest.HTTPClientFor(c.restConfig)
	if err != nil {
		return nil, err
	}

	rm, err := apiutil.NewDynamicRESTMapper(c.restConfig, rcl)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to create dynamic rest mapper"))
	}

	cl, err := client.New(c.restConfig, client.Options{
		Scheme: scheme.Scheme,
		Mapper: rm,
	})
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to create client"))
	}
	return cl, nil
}

// Initializes clients for operators.
func (c *Client) initOperatorClients() error {
	customClient, err := customresources.NewForConfig(c.restConfig)
	if err != nil {
		return err
	}
	c.customClientSet = customClient
	_, err = c.GetServerVersion()
	if err != nil {
		return err
	}

	return nil
}

// Config returns restConfig to the pkg/kubernetes.Kubernetes client.
func (c *Client) Config() *rest.Config {
	return c.restConfig
}

// Clientset returns the k8s clientset.
//
//nolint:ireturn
func (c *Client) Clientset() kubernetes.Interface {
	return c.clientset
}

// ClusterName returns the name of the k8s cluster.
func (c *Client) ClusterName() string {
	return c.clusterName
}

// Namespace returns the namespace of the k8s cluster.
func (c *Client) Namespace() string {
	return c.namespace
}

// GetSecretsForServiceAccount returns secret by given service account name.
func (c *Client) GetSecretsForServiceAccount(ctx context.Context, accountName string) (*corev1.Secret, error) {
	serviceAccount, err := c.clientset.CoreV1().ServiceAccounts(c.namespace).Get(ctx, accountName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	if len(serviceAccount.Secrets) == 0 {
		return nil, fmt.Errorf("no secrets available for namespace %s", c.namespace)
	}

	return c.clientset.CoreV1().Secrets(c.namespace).Get(
		ctx,
		serviceAccount.Secrets[0].Name,
		metav1.GetOptions{},
	)
}

// GenerateKubeConfigWithToken generates kubeconfig with a user and token provided as a secret.
func (c *Client) GenerateKubeConfigWithToken(user string, secret *corev1.Secret) ([]byte, error) {
	conf := &Config{
		Kind:           configKind,
		APIVersion:     apiVersion,
		CurrentContext: defaultName,
	}
	conf.Clusters = []ClusterInfo{
		{
			Name: defaultName,
			Cluster: Cluster{
				CertificateAuthorityData: secret.Data["ca.crt"],
				Server:                   c.restConfig.Host,
			},
		},
	}
	conf.Contexts = []ContextInfo{
		{
			Name: defaultName,
			Context: Context{
				Cluster:   defaultName,
				User:      user,
				Namespace: defaultName,
			},
		},
	}
	conf.Users = []UserInfo{
		{
			Name: user,
			User: User{
				Token: string(secret.Data["token"]),
			},
		},
	}

	return c.marshalKubeConfig(conf)
}

// GetServerVersion returns server version.
func (c *Client) GetServerVersion() (*version.Info, error) {
	return c.clientset.Discovery().ServerVersion()
}

// ApplyObject applies object.
func (c *Client) ApplyObject(obj runtime.Object) error {
	// Instantiate a new restmapper so we discover any new resources before applying object.
	groupResources, err := restmapper.GetAPIGroupResources(c.clientset.Discovery())
	if err != nil {
		return err
	}
	mapper := restmapper.NewDiscoveryRESTMapper(groupResources)

	gvk := obj.GetObjectKind().GroupVersionKind()
	gk := schema.GroupKind{Group: gvk.Group, Kind: gvk.Kind}
	mapping, err := mapper.RESTMapping(gk, gvk.Version)
	if err != nil {
		return err
	}
	namespace, name, err := c.retrieveMetaFromObject(obj)
	if err != nil {
		return err
	}
	cli, err := c.resourceClient(mapping.GroupVersionKind.GroupVersion())
	if err != nil {
		return err
	}
	helper := resource.NewHelper(cli, mapping)
	return c.applyObject(helper, namespace, name, obj)
}

func (c *Client) applyObject(helper *resource.Helper, namespace, name string, obj runtime.Object) error {
	if _, err := helper.Get(namespace, name); err != nil {
		_, err = helper.Create(namespace, false, obj)
		if err != nil {
			return err
		}
	} else {
		_, err = helper.Replace(namespace, name, true, obj)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) retrieveMetaFromObject(obj runtime.Object) (string, string, error) {
	name, err := meta.NewAccessor().Name(obj)
	if err != nil {
		return "", name, err
	}
	namespace, err := meta.NewAccessor().Namespace(obj)
	if err != nil {
		return namespace, name, err
	}
	if namespace == "" {
		namespace = c.namespace
	}
	return namespace, name, nil
}

func (c *Client) resourceClient( //nolint:ireturn,nolintlint
	gv schema.GroupVersion,
) (rest.Interface, error) {
	cfg := c.restConfig
	cfg.ContentConfig = resource.UnstructuredPlusDefaultContentConfig()
	cfg.GroupVersion = &gv
	if len(gv.Group) == 0 {
		cfg.APIPath = defaultAPIURIPath
	} else {
		cfg.APIPath = defaultAPIsURIPath
	}
	return rest.RESTClientFor(cfg)
}

// DeleteObject deletes object from the k8s cluster.
func (c *Client) DeleteObject(obj runtime.Object) error {
	groupResources, err := restmapper.GetAPIGroupResources(c.clientset.Discovery())
	if err != nil {
		return err
	}
	mapper := restmapper.NewDiscoveryRESTMapper(groupResources)

	gvk := obj.GetObjectKind().GroupVersionKind()
	gk := schema.GroupKind{Group: gvk.Group, Kind: gvk.Kind}
	mapping, err := mapper.RESTMapping(gk, gvk.Version)
	if err != nil {
		return err
	}
	namespace, name, err := c.retrieveMetaFromObject(obj)
	if err != nil {
		return err
	}
	cli, err := c.resourceClient(mapping.GroupVersionKind.GroupVersion())
	if err != nil {
		return err
	}
	helper := resource.NewHelper(cli, mapping)
	err = deleteObject(helper, namespace, name)
	return err
}

func deleteObject(helper *resource.Helper, namespace, name string) error {
	if _, err := helper.Get(namespace, name); err == nil {
		_, err = helper.Delete(namespace, name)
		if err != nil {
			return err
		}
	}
	return nil
}

// ListObjects lists objects by provided group, version, kind.
func (c *Client) ListObjects(gvk schema.GroupVersionKind, into runtime.Object) error {
	helper, err := c.helperForGVK(gvk)
	if err != nil {
		return errors.Join(err, errors.New("could not create helper"))
	}

	l, err := helper.List(c.namespace, gvk.Version, &metav1.ListOptions{})
	if err != nil {
		return err
	}

	u, err := runtime.DefaultUnstructuredConverter.ToUnstructured(l)
	if err != nil {
		return err
	}

	return runtime.DefaultUnstructuredConverter.FromUnstructured(u, into)
}

// GetObject retrieves an object by provided group, version, kind and name.
func (c *Client) GetObject(gvk schema.GroupVersionKind, name string, into runtime.Object) error {
	helper, err := c.helperForGVK(gvk)
	if err != nil {
		return errors.Join(err, errors.New("could not create helper"))
	}

	l, err := helper.Get(c.namespace, name)
	if err != nil {
		return errors.Join(err, errors.New("failed to get object using helper"))
	}

	u, err := runtime.DefaultUnstructuredConverter.ToUnstructured(l)
	if err != nil {
		return errors.Join(err, errors.New("failed to convert object to unstructured"))
	}

	return runtime.DefaultUnstructuredConverter.FromUnstructured(u, into)
}

func (c *Client) helperForGVK(gvk schema.GroupVersionKind) (*resource.Helper, error) {
	groupResources, err := restmapper.GetAPIGroupResources(c.clientset.Discovery())
	if err != nil {
		return nil, err
	}
	mapper := restmapper.NewDiscoveryRESTMapper(groupResources)

	gk := schema.GroupKind{Group: gvk.Group, Kind: gvk.Kind}
	mapping, err := mapper.RESTMapping(gk, gvk.Version)
	if err != nil {
		return nil, err
	}
	cli, err := c.resourceClient(mapping.GroupVersionKind.GroupVersion())
	if err != nil {
		return nil, err
	}

	return resource.NewHelper(cli, mapping), nil
}

func (c *Client) marshalKubeConfig(conf *Config) ([]byte, error) {
	config, err := json.Marshal(&conf)
	if err != nil {
		return nil, err
	}

	var jsonObj interface{}
	err = yaml.Unmarshal(config, &jsonObj)
	if err != nil {
		return nil, err
	}

	return yaml.Marshal(jsonObj)
}

// GetLogs returns logs for pod.
func (c *Client) GetLogs(ctx context.Context, pod, container string) (string, error) {
	defaultLogLines := int64(3000)
	options := &corev1.PodLogOptions{}
	if container != "" {
		options.Container = container
	}

	options.TailLines = &defaultLogLines
	buf := &bytes.Buffer{}

	req := c.clientset.CoreV1().Pods(c.namespace).GetLogs(pod, options)
	podLogs, err := req.Stream(ctx)
	if err != nil {
		return buf.String(), err
	}

	_, err = io.Copy(buf, podLogs)
	if err != nil {
		return buf.String(), err
	}

	return buf.String(), nil
}

// GetEvents retrieves events from a pod by a name.
func (c *Client) GetEvents(ctx context.Context, name string) (string, error) {
	pod, err := c.clientset.CoreV1().Pods(c.namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		eventsInterface := c.clientset.CoreV1().Events(c.namespace)
		selector := eventsInterface.GetFieldSelector(&name, &c.namespace, nil, nil)
		initialOpts := metav1.ListOptions{
			FieldSelector: selector.String(),
			Limit:         defaultChunkSize,
		}
		events := &corev1.EventList{}
		err2 := resource.FollowContinue(&initialOpts,
			func(options metav1.ListOptions) (runtime.Object, error) {
				newList, err := eventsInterface.List(ctx, options)
				if err != nil {
					return nil, resource.EnhanceListError(err, options, "events")
				}

				events.Items = append(events.Items, newList.Items...)
				return newList, nil
			})

		if err2 == nil && len(events.Items) > 0 {
			return tabbedString(func(out io.Writer) error {
				w := NewPrefixWriter(out)
				w.Writef(0, "Pod '%v': error '%v', but found events.\n", name, err)
				DescribeEvents(events, w)
				return nil
			})
		}

		return "", err
	}

	var events *corev1.EventList
	if ref, err := reference.GetReference(scheme.Scheme, pod); err != nil {
		c.l.Warnf("Unable to construct reference to '%#v': %v", pod, err)
	} else {
		ref.Kind = ""
		if _, isMirrorPod := pod.Annotations[corev1.MirrorPodAnnotationKey]; isMirrorPod {
			ref.UID = types.UID(pod.Annotations[corev1.MirrorPodAnnotationKey])
		}

		events, _ = searchEvents(ctx, c.clientset.CoreV1(), ref, defaultChunkSize)
	}

	return tabbedString(func(out io.Writer) error {
		w := NewPrefixWriter(out)
		w.Writef(LEVEL0, name+" ")
		DescribeEvents(events, w)
		return nil
	})
}

func tabbedString(f func(io.Writer) error) (string, error) {
	out := &tabwriter.Writer{}
	buf := &bytes.Buffer{}
	out.Init(buf, 0, 8, 2, ' ', 0)

	if err := f(out); err != nil {
		return "", err
	}

	if err := out.Flush(); err != nil {
		return "", err
	}

	str := buf.String()
	return str, nil
}

// DescribeEvents describes events.
func DescribeEvents(el *corev1.EventList, w PrefixWriter) {
	if len(el.Items) == 0 {
		w.Writef(LEVEL0, "Events:\t<none>\n")
		return
	}

	w.Flush()
	sort.Sort(SortableEvents(el.Items))
	w.Writef(LEVEL0, "Events:\n  Type\tReason\tAge\tFrom\tMessage\n")
	w.Writef(LEVEL1, "----\t------\t----\t----\t-------\n")
	for _, e := range el.Items {
		var interval string
		firstTimestampSince := translateMicroTimestampSince(e.EventTime)
		if e.EventTime.IsZero() {
			firstTimestampSince = translateTimestampSince(e.FirstTimestamp)
		}

		switch {
		case e.Series != nil:
			interval = fmt.Sprintf(
				"%s (x%d over %s)",
				translateMicroTimestampSince(e.Series.LastObservedTime),
				e.Series.Count,
				firstTimestampSince,
			)
		case e.Count > 1:
			interval = fmt.Sprintf("%s (x%d over %s)", translateTimestampSince(e.LastTimestamp), e.Count, firstTimestampSince)
		default:
			interval = firstTimestampSince
		}

		source := e.Source.Component
		if source == "" {
			source = e.ReportingController
		}

		w.Writef(LEVEL1, "%v\t%v\t%s\t%v\t%v\n",
			e.Type,
			e.Reason,
			interval,
			source,
			strings.TrimSpace(e.Message),
		)
	}
}

// searchEvents finds events about the specified object.
// It is very similar to CoreV1.Events.Search, but supports the Limit parameter.
func searchEvents(
	ctx context.Context,
	client corev1client.EventsGetter,
	objOrRef runtime.Object,
	limit int64,
) (*corev1.EventList, error) {
	ref, err := reference.GetReference(scheme.Scheme, objOrRef)
	if err != nil {
		return nil, err
	}

	var refKind *string
	if stringRefKind := ref.Kind; len(stringRefKind) > 0 {
		refKind = &stringRefKind
	}

	stringRefUID := string(ref.UID)
	var refUID *string
	if len(stringRefUID) > 0 {
		refUID = &stringRefUID
	}

	e := client.Events(ref.Namespace)
	fieldSelector := e.GetFieldSelector(&ref.Name, &ref.Namespace, refKind, refUID)
	initialOpts := metav1.ListOptions{FieldSelector: fieldSelector.String(), Limit: limit}
	eventList := &corev1.EventList{}
	err = resource.FollowContinue(&initialOpts,
		func(options metav1.ListOptions) (runtime.Object, error) {
			newEvents, err := e.List(ctx, options)
			if err != nil {
				return nil, resource.EnhanceListError(err, options, "events")
			}

			eventList.Items = append(eventList.Items, newEvents.Items...)
			return newEvents, nil
		})

	return eventList, err
}

// translateMicroTimestampSince returns the elapsed time since timestamp in
// human-readable approximation.
func translateMicroTimestampSince(timestamp metav1.MicroTime) string {
	if timestamp.IsZero() {
		return "<unknown>"
	}

	return duration.HumanDuration(time.Since(timestamp.Time))
}

// translateTimestampSince returns the elapsed time since timestamp in
// human-readable approximation.
func translateTimestampSince(timestamp metav1.Time) string {
	if timestamp.IsZero() {
		return "<unknown>"
	}

	return duration.HumanDuration(time.Since(timestamp.Time))
}

// ApplyFile accepts manifest file contents, parses into []runtime.Object
// and applies them against the cluster.
func (c *Client) ApplyFile(fileBytes []byte) error {
	objs, err := c.getObjects(fileBytes)
	if err != nil {
		return err
	}
	for i := range objs {
		err := c.ApplyObject(objs[i])
		if err != nil {
			return err
		}
	}
	return nil
}

// ApplyManifestFile accepts manifest file contents, parses into []runtime.Object
// and applies them against the cluster.
func (c *Client) ApplyManifestFile(fileBytes []byte, namespace string, ignoreObjects ...client.Object) error {
	objs, err := c.getObjects(fileBytes)
	if err != nil {
		return err
	}
	for i := range objs {
		o := objs[i]

		// Check if this object should be ignored?
		if slices.ContainsFunc(ignoreObjects, func(ign client.Object) bool {
			return o.GetKind() == ign.GetObjectKind().GroupVersionKind().Kind &&
				o.GetName() == ign.GetName() &&
				ign.GetNamespace() == namespace
		}) {
			continue
		}

		if err := c.applyTemplateCustomization(o, namespace); err != nil {
			return err
		}
		err := c.ApplyObject(o)
		if err != nil {
			return err
		}
	}
	return nil
}

// DeleteManifestFile accepts manifest file contents, parses into []runtime.Object
// and deletes them from the cluster.
func (c *Client) DeleteManifestFile(fileBytes []byte, namespace string) error {
	objs, err := c.getObjects(fileBytes)
	if err != nil {
		return err
	}
	for i := range objs {
		o := objs[i]
		if err := c.applyTemplateCustomization(o, namespace); err != nil {
			return err
		}
		err := c.DeleteObject(o)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) applyTemplateCustomization(u *unstructured.Unstructured, namespace string) error {
	if err := unstructured.SetNestedField(u.Object, namespace, "metadata", "namespace"); err != nil {
		return err
	}

	kind, ok, err := unstructured.NestedString(u.Object, "kind")
	if err != nil {
		return err
	}

	if ok && kind == "ClusterRoleBinding" {
		if err := c.updateClusterRoleBinding(u, namespace); err != nil {
			return err
		}
	}
	if ok && kind == "Service" {
		// During installation or upgrading of the everest API Server
		// CLI should keep spec.type untouched to prevent overriding of it.
		if err := c.setEverestServiceType(u, namespace); err != nil {
			return err
		}
	}

	return nil
}

func (c *Client) setEverestServiceType(u *unstructured.Unstructured, namespace string) error {
	s, err := c.GetService(context.Background(), namespace, "everest")
	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}
	if err != nil && apierrors.IsNotFound(err) {
		return nil
	}
	if s != nil && s.Name != "" {
		if err := unstructured.SetNestedField(u.Object, string(s.Spec.Type), "spec", "type"); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) updateClusterRoleBinding(u *unstructured.Unstructured, namespace string) error {
	sub, ok, err := unstructured.NestedFieldNoCopy(u.Object, "subjects")
	if err != nil {
		return err
	}

	if !ok {
		return nil
	}

	subjects, ok := sub.([]interface{})
	if !ok {
		return nil
	}

	for _, s := range subjects {
		sub, ok := s.(map[string]interface{})
		if !ok {
			continue
		}

		if err := unstructured.SetNestedField(sub, namespace, "namespace"); err != nil {
			return err
		}
	}
	return unstructured.SetNestedSlice(u.Object, subjects, "subjects")
}

func (c *Client) getObjects(f []byte) ([]*unstructured.Unstructured, error) {
	objs := []*unstructured.Unstructured{}
	decoder := yamlutil.NewYAMLOrJSONDecoder(bytes.NewReader(f), 100)
	var err error
	for {
		var rawObj runtime.RawExtension
		if err = decoder.Decode(&rawObj); err != nil {
			break
		}

		obj, _, err := yamlSerializer.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(rawObj.Raw, nil, nil)
		if err != nil {
			return nil, err
		}

		unstructuredMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
		if err != nil {
			return nil, err
		}

		objs = append(objs, &unstructured.Unstructured{Object: unstructuredMap})
	}

	return objs, nil //nolint:nilerr
}

// DoCSVWait waits until for a CSV to be applied.
func (c Client) DoCSVWait(ctx context.Context, key types.NamespacedName) error {
	kubeclient, err := c.getKubeclient()
	if err != nil {
		return err
	}

	return c.pollCsvPhaseSucceeded(ctx, key, kubeclient)
}

func (c Client) pollCsvPhaseSucceeded(ctx context.Context, key types.NamespacedName, kubeclient client.Client) error {
	var (
		curPhase v1alpha1.ClusterServiceVersionPhase
		newPhase v1alpha1.ClusterServiceVersionPhase
	)

	csv := v1alpha1.ClusterServiceVersion{}
	csvPhaseSucceeded := func(ctx context.Context) (bool, error) {
		err := kubeclient.Get(ctx, key, &csv)
		if err != nil {
			if apierrors.IsNotFound(err) {
				return false, nil
			}
			return false, err
		}
		newPhase = csv.Status.Phase
		if newPhase != curPhase {
			curPhase = newPhase
		}

		//nolint:exhaustive
		switch curPhase {
		case v1alpha1.CSVPhaseFailed:
			return false, fmt.Errorf("csv failed: reason: %q, message: %q", csv.Status.Reason, csv.Status.Message)
		case v1alpha1.CSVPhaseSucceeded:
			return true, nil
		default:
			return false, nil
		}
	}

	err := wait.PollUntilContextCancel(ctx, time.Second, true, csvPhaseSucceeded)
	if err != nil && errors.Is(err, context.DeadlineExceeded) {
		depCheckErr := c.checkDeploymentErrors(ctx, key, csv)
		if depCheckErr != nil {
			return depCheckErr
		}
	}
	return err
}

// GetSubscriptionCSV retrieves a subscription CSV.
func (c Client) GetSubscriptionCSV(ctx context.Context, subKey types.NamespacedName) (types.NamespacedName, error) {
	var csvKey types.NamespacedName

	kubeclient, err := c.getKubeclient()
	if err != nil {
		return csvKey, err
	}

	subscriptionInstalledCSV := func(ctx context.Context) (bool, error) {
		sub := v1alpha1.Subscription{}
		err := kubeclient.Get(ctx, subKey, &sub)
		if err != nil {
			return false, err
		}
		installedCSV := sub.Status.InstalledCSV
		if installedCSV == "" {
			return false, nil
		}
		csvKey = types.NamespacedName{
			Namespace: subKey.Namespace,
			Name:      installedCSV,
		}
		log.Printf("  Found installed CSV %q", installedCSV)
		return true, nil
	}
	return csvKey, wait.PollUntilContextCancel(ctx, time.Second, true, subscriptionInstalledCSV)
}

func (c *Client) getKubeclient() (client.Client, error) { //nolint:ireturn,nolintlint
	rcl, err := rest.HTTPClientFor(c.restConfig)
	if err != nil {
		return nil, err
	}

	rm, err := apiutil.NewDynamicRESTMapper(c.restConfig, rcl)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to create dynamic rest mapper"))
	}

	cl, err := client.New(c.restConfig, client.Options{
		Scheme: scheme.Scheme,
		Mapper: rm,
	})
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to create client"))
	}
	return cl, nil
}

// checkDeploymentErrors function loops through deployment specs of a given CSV, and prints reason
// in case of failures, based on deployment condition.
func (c Client) checkDeploymentErrors(
	ctx context.Context,
	key types.NamespacedName,
	csv v1alpha1.ClusterServiceVersion,
) error {
	depErrs := deploymentErrors{}
	if key.Namespace == "" {
		return errors.New("no namespace provided to get deployment failures")
	}

	kubeclient, err := c.getKubeclient()
	if err != nil {
		return err
	}

	dep := &appsv1.Deployment{}
	for _, ds := range csv.Spec.InstallStrategy.StrategySpec.DeploymentSpecs {
		depKey := types.NamespacedName{
			Namespace: key.Namespace,
			Name:      ds.Name,
		}
		depSelectors := ds.Spec.Selector
		if err := kubeclient.Get(ctx, depKey, dep); err != nil {
			depErrs = append(depErrs, deploymentError{
				resourceError: resourceError{
					name:  ds.Name,
					issue: err.Error(),
				},
			})
			continue
		}
		for _, s := range dep.Status.Conditions {
			if s.Type == appsv1.DeploymentAvailable && s.Status != corev1.ConditionTrue {
				depErr := deploymentError{
					resourceError: resourceError{
						name:  ds.Name,
						issue: s.Reason,
					},
				}
				podErr := c.checkPodErrors(ctx, kubeclient, depSelectors, key)
				podErrs := podErrors{}
				if errors.As(podErr, &podErrs) {
					depErr.podErrs = append(depErr.podErrs, podErrs...)
				} else {
					return podErr
				}
				depErrs = append(depErrs, depErr)
			}
		}
	}

	return depErrs
}

// checkPodErrors loops through pods, and returns pod errors if any.
func (c Client) checkPodErrors(
	ctx context.Context,
	kubeclient client.Client,
	depSelectors *metav1.LabelSelector,
	key types.NamespacedName,
) error {
	// loop through pods and return specific error message.
	podErr := podErrors{}
	podList := &corev1.PodList{}
	podLabelSelectors, err := metav1.LabelSelectorAsSelector(depSelectors)
	if err != nil {
		return err
	}

	options := client.ListOptions{
		LabelSelector: podLabelSelectors,
		Namespace:     key.Namespace,
	}

	if err := kubeclient.List(ctx, podList, &options); err != nil {
		return errors.Join(err, errors.New("error getting Pods"))
	}

	for _, p := range podList.Items {
		for _, cs := range p.Status.ContainerStatuses {
			if !cs.Ready {
				if cs.State.Waiting != nil {
					containerName := p.Name + ":" + cs.Name
					podErr = append(podErr, podError{resourceError{name: containerName, issue: cs.State.Waiting.Message}})
				}
			}
		}
	}

	return podErr
}

// DoRolloutWait waits until a deployment has been rolled out susccessfully or there is an error.
func (c Client) DoRolloutWait(ctx context.Context, key types.NamespacedName) error {
	kubeclient, err := c.getKubeclient()
	if err != nil {
		return err
	}

	return c.pollRolloutComplete(ctx, key, kubeclient)
}

func (c Client) pollRolloutComplete(ctx context.Context, key types.NamespacedName, kubeclient client.Client) error {
	rolloutComplete := func(ctx context.Context) (bool, error) {
		deployment := appsv1.Deployment{}
		err := kubeclient.Get(ctx, key, &deployment)
		if err != nil {
			if apierrors.IsNotFound(err) {
				// Waiting for Deployment to appear
				return false, nil
			}
			return false, err
		}
		if deployment.Generation <= deployment.Status.ObservedGeneration {
			cond := deploymentutil.GetDeploymentCondition(deployment.Status, appsv1.DeploymentProgressing)
			if cond != nil && cond.Reason == deploymentutil.TimedOutReason {
				return false, errors.New("progress deadline exceeded")
			}
			if deployment.Spec.Replicas != nil && deployment.Status.UpdatedReplicas < *deployment.Spec.Replicas {
				// Waiting for Deployment to rollout. Not all replicas have been updated
				return false, nil
			}
			if deployment.Status.Replicas > deployment.Status.UpdatedReplicas {
				// Waiting for Deployment to rollout. Old replicas are pending termination
				return false, nil
			}
			if deployment.Status.AvailableReplicas < deployment.Status.UpdatedReplicas {
				// Waiting for Deployment to rollout. Not all updated replicas are available
				return false, nil
			}
			// Deployment successfully rolled out
			return true, nil
		}
		// Waiting for Deployment to rollout: waiting for deployment spec update to be observed
		return false, nil
	}
	return wait.PollUntilContextCancel(ctx, time.Second, true, rolloutComplete)
}

// GetOperatorGroup retrieves an operator group details by namespace and name.
func (c *Client) GetOperatorGroup(ctx context.Context, namespace, name string) (*v1.OperatorGroup, error) {
	operatorClient, err := olmVersioned.NewForConfig(c.restConfig)
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot create an operator client instance"))
	}

	if namespace == "" {
		namespace = c.namespace
	}

	return operatorClient.OperatorsV1().OperatorGroups(namespace).Get(ctx, name, metav1.GetOptions{})
}

// CreateOperatorGroup creates an operator group to be used as part of a subscription.
func (c *Client) CreateOperatorGroup(ctx context.Context, namespace, name string, targetNamespaces []string) (*v1.OperatorGroup, error) {
	if namespace == "" {
		namespace = c.namespace
	}
	og := &v1.OperatorGroup{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: v1.OperatorGroupSpec{
			TargetNamespaces: targetNamespaces,
		},
		Status: v1.OperatorGroupStatus{
			LastUpdated: &metav1.Time{
				Time: time.Now(),
			},
		},
	}

	return c.olmClientset.OperatorsV1().OperatorGroups(namespace).Create(ctx, og, metav1.CreateOptions{})
}

// CreateSubscription creates an OLM subscription.
func (c *Client) CreateSubscription(ctx context.Context, namespace string, subscription *v1alpha1.Subscription) (*v1alpha1.Subscription, error) {
	sub, err := c.olmClientset.
		OperatorsV1alpha1().
		Subscriptions(namespace).
		Create(ctx, subscription, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			return sub, nil
		}
		return sub, err
	}
	return sub, nil
}

// UpdateSubscription updates an OLM subscription.
func (c *Client) UpdateSubscription(ctx context.Context, namespace string, subscription *v1alpha1.Subscription) (*v1alpha1.Subscription, error) {
	sub, err := c.olmClientset.
		OperatorsV1alpha1().
		Subscriptions(namespace).
		Update(ctx, subscription, metav1.UpdateOptions{})
	if err != nil {
		return sub, err
	}
	return sub, nil
}

// CreateSubscriptionForCatalog creates an OLM subscription.
func (c *Client) CreateSubscriptionForCatalog(ctx context.Context, namespace, name, catalogNamespace, catalog,
	packageName, channel, startingCSV string, approval v1alpha1.Approval,
) (*v1alpha1.Subscription, error) {
	subscription := &v1alpha1.Subscription{
		TypeMeta: metav1.TypeMeta{
			Kind:       v1alpha1.SubscriptionKind,
			APIVersion: v1alpha1.SubscriptionCRDAPIVersion,
		},
		ObjectMeta: metav1.ObjectMeta{
			Namespace: namespace,
			Name:      name,
		},
		Spec: &v1alpha1.SubscriptionSpec{
			CatalogSource:          catalog,
			CatalogSourceNamespace: catalogNamespace,
			Package:                packageName,
			Channel:                channel,
			StartingCSV:            startingCSV,
			InstallPlanApproval:    approval,
		},
	}
	sub, err := c.olmClientset.
		OperatorsV1alpha1().
		Subscriptions(namespace).
		Create(ctx, subscription, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			return sub, nil
		}
		return sub, err
	}
	return sub, nil
}

// GetSubscription retrieves an OLM subscription by namespace and name.
func (c *Client) GetSubscription(ctx context.Context, namespace, name string) (*v1alpha1.Subscription, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().Subscriptions(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListSubscriptions all the subscriptions in the namespace.
func (c *Client) ListSubscriptions(ctx context.Context, namespace string) (*v1alpha1.SubscriptionList, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().Subscriptions(namespace).List(ctx, metav1.ListOptions{})
}

// DoPackageWait for the package to be available in OLM.
func (c *Client) DoPackageWait(ctx context.Context, namespace, name string) error {
	packageInstalled := func(ctx context.Context) (bool, error) {
		_, err := c.GetPackageManifest(ctx, namespace, name)
		if err != nil {
			if apierrors.ReasonForError(err) == metav1.StatusReasonUnknown {
				return false, err
			}
			return false, nil
		}
		return true, nil
	}
	return wait.PollUntilContextCancel(ctx, time.Second, true, packageInstalled)
}

// GetPackageManifest returns a package manifest by given name.
func (c *Client) GetPackageManifest(ctx context.Context, namespace, name string) (*packagev1.PackageManifest, error) {
	operatorClient, err := packageServerClient.NewForConfig(c.restConfig)
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot create an operator client instance"))
	}

	return operatorClient.OperatorsV1().PackageManifests(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListCRDs returns a list of CRDs.
func (c *Client) ListCRDs(
	ctx context.Context,
	labelSelector *metav1.LabelSelector,
) (*apiextv1.CustomResourceDefinitionList, error) {
	options := metav1.ListOptions{}
	if labelSelector != nil && (labelSelector.MatchLabels != nil || labelSelector.MatchExpressions != nil) {
		options.LabelSelector = metav1.FormatLabelSelector(labelSelector)
	}

	return c.apiextClientset.ApiextensionsV1().CustomResourceDefinitions().List(ctx, options)
}

// ListCRs returns a list of CRs.
func (c *Client) ListCRs(
	ctx context.Context,
	namespace string,
	gvr schema.GroupVersionResource,
	labelSelector *metav1.LabelSelector,
) (*unstructured.UnstructuredList, error) {
	options := metav1.ListOptions{}
	if labelSelector != nil && (labelSelector.MatchLabels != nil || labelSelector.MatchExpressions != nil) {
		options.LabelSelector = metav1.FormatLabelSelector(labelSelector)
	}

	return c.dynamicClientset.Resource(gvr).Namespace(namespace).List(ctx, options)
}

// GetClusterServiceVersion retrieve a CSV by namespaced name.
func (c *Client) GetClusterServiceVersion(
	ctx context.Context,
	key types.NamespacedName,
) (*v1alpha1.ClusterServiceVersion, error) {
	return c.olmClientset.OperatorsV1alpha1().ClusterServiceVersions(key.Namespace).Get(ctx, key.Name, metav1.GetOptions{})
}

// ListClusterServiceVersion list all CSVs for the given namespace.
func (c *Client) ListClusterServiceVersion(
	ctx context.Context,
	namespace string,
) (*v1alpha1.ClusterServiceVersionList, error) {
	return c.olmClientset.OperatorsV1alpha1().ClusterServiceVersions(namespace).List(ctx, metav1.ListOptions{})
}

// UpdateClusterServiceVersion updates a CSV and returns the updated CSV.
func (c *Client) UpdateClusterServiceVersion(
	ctx context.Context,
	csv *v1alpha1.ClusterServiceVersion,
) (*v1alpha1.ClusterServiceVersion, error) {
	return c.olmClientset.OperatorsV1alpha1().ClusterServiceVersions(csv.Namespace).Update(ctx, csv, metav1.UpdateOptions{})
}

// DeleteClusterServiceVersion deletes a CSV by namespaced name.
func (c *Client) DeleteClusterServiceVersion(
	ctx context.Context,
	key types.NamespacedName,
) error {
	return c.olmClientset.OperatorsV1alpha1().ClusterServiceVersions(key.Namespace).Delete(ctx, key.Name, metav1.DeleteOptions{})
}

// DeleteFile accepts manifest file contents parses into []runtime.Object
// and deletes them from the cluster.
func (c *Client) DeleteFile(fileBytes []byte) error {
	objs, err := c.getObjects(fileBytes)
	if err != nil {
		return err
	}
	for i := range objs {
		err := c.DeleteObject(objs[i])
		if err != nil {
			return err
		}
	}
	return nil
}

// GetService returns k8s service by provided namespace and name.
func (c *Client) GetService(ctx context.Context, namespace, name string) (*corev1.Service, error) {
	return c.clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetClusterRoleBinding returns cluster role binding by given name.
func (c *Client) GetClusterRoleBinding(ctx context.Context, name string) (*rbacv1.ClusterRoleBinding, error) {
	return c.clientset.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
}
