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

package kubernetes

import (
	context "context"
	"encoding/json"
	"errors"
	fmt "fmt"
	"hash/fnv"
	"maps"
	"net/netip"
	"net/url"
	"strconv"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/utils/ptr"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/clusters"
	"github.com/percona/everest/pkg/common"
)

// Clusters manages k8s clusters stored as secrets
// similar to Accounts in accounts.go

type clustersClient struct {
	k KubernetesConnector
}

func (k *Kubernetes) Clusters() clusters.Interface {
	return &clustersClient{k: k}
}

// URIToSecretName hashes an uri address to the secret name using a formula.
// Part of the uri address is incorporated for debugging purposes
func URIToSecretName(uriType, uri string) (string, error) {
	parsedURI, err := url.ParseRequestURI(uri)
	if err != nil {
		return "", err
	}
	host := parsedURI.Host
	if strings.HasPrefix(host, "[") {
		last := strings.Index(host, "]")
		if last >= 0 {
			addr, err := netip.ParseAddr(host[1:last])
			if err != nil {
				return "", err
			}
			host = strings.ReplaceAll(addr.String(), ":", "-")
		}
	} else {
		last := strings.Index(host, ":")
		if last >= 0 {
			host = host[0:last]
		}
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(uri))
	host = strings.ToLower(host)
	return fmt.Sprintf("%s-%s-%v", uriType, host, h.Sum32()), nil
}

// clusterToSecret converts a cluster object to string data for serialization to a secret
func clusterToSecret(c *clusters.Cluster, secret *corev1.Secret) error {
	data := make(map[string][]byte)
	data["server"] = []byte(strings.TrimRight(c.Server, "/"))
	if c.Name == "" {
		data["name"] = []byte(c.Server)
	} else {
		data["name"] = []byte(c.Name)
	}
	if len(c.Namespaces) != 0 {
		data["namespaces"] = []byte(strings.Join(c.Namespaces, ","))
	}
	configBytes, err := json.Marshal(c.Config)
	if err != nil {
		return err
	}
	data["config"] = configBytes
	if c.Shard != nil {
		data["shard"] = []byte(strconv.Itoa(int(*c.Shard)))
	}
	if c.ClusterResources {
		data["clusterResources"] = []byte("true")
	}
	if c.Project != "" {
		data["project"] = []byte(c.Project)
	}
	secret.Data = data

	secret.Labels = c.Labels
	if c.Annotations != nil && c.Annotations[corev1.LastAppliedConfigAnnotation] != "" {
		return errors.New("cannot set 'last-applied-configuration' annotation on cluster secrets")
	}
	secret.Annotations = c.Annotations

	if secret.Annotations == nil {
		secret.Annotations = make(map[string]string)
	}

	//if c.RefreshRequestedAt != nil {
	//	secret.Annotations[appv1.AnnotationKeyRefresh] = c.RefreshRequestedAt.Format(time.RFC3339)
	//} else {
	//	delete(secret.Annotations, appv1.AnnotationKeyRefresh)
	//}
	//addSecretMetadata(secret, common.LabelValueSecretTypeCluster)
	if secret.Labels == nil {
		secret.Labels = map[string]string{}
	}
	secret.Labels[clusters.ClusterSecretTypeLabelKey] = clusters.ClusterSecretTypeLabelValue
	return nil
}

// SecretToCluster converts a secret into a Cluster object
func SecretToCluster(s *corev1.Secret) (*clusters.Cluster, error) {
	var config clusters.ClusterConfig
	if len(s.Data["config"]) > 0 {
		err := json.Unmarshal(s.Data["config"], &config)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal cluster config: %w", err)
		}
	}

	var namespaces []string
	for _, ns := range strings.Split(string(s.Data["namespaces"]), ",") {
		if ns = strings.TrimSpace(ns); ns != "" {
			namespaces = append(namespaces, ns)
		}
	}
	//var refreshRequestedAt *metav1.Time
	//if v, found := s.Annotations[appv1.AnnotationKeyRefresh]; found {
	//	requestedAt, err := time.Parse(time.RFC3339, v)
	//	if err != nil {
	//		log.Warnf("Error while parsing date in cluster secret '%s': %v", s.Name, err)
	//	} else {
	//		refreshRequestedAt = &metav1.Time{Time: requestedAt}
	//	}
	//}
	var shard *int64
	if shardStr := s.Data["shard"]; shardStr != nil {
		if val, err := strconv.Atoi(string(shardStr)); err != nil {
			// log.Warnf("Error while parsing shard in cluster secret '%s': %v", s.Name, err)
		} else {
			shard = ptr.To(int64(val))
		}
	}

	// copy labels and annotations excluding system ones
	labels := map[string]string{}
	if s.Labels != nil {
		labels = maps.Clone(s.Labels)
		delete(labels, clusters.ClusterSecretTypeLabelKey)
	}
	annotations := map[string]string{}
	if s.Annotations != nil {
		annotations = maps.Clone(s.Annotations)
		// delete system annotations
		delete(annotations, corev1.LastAppliedConfigAnnotation)
		// delete(annotations, common.AnnotationKeyManagedBy)
	}

	cluster := clusters.Cluster{
		ID:               string(s.UID),
		Server:           strings.TrimRight(string(s.Data["server"]), "/"),
		Name:             string(s.Data["name"]),
		Namespaces:       namespaces,
		ClusterResources: string(s.Data["clusterResources"]) == "true",
		Config:           config,
		// RefreshRequestedAt: refreshRequestedAt,
		Shard:       shard,
		Project:     string(s.Data["project"]),
		Labels:      labels,
		Annotations: annotations,
	}
	return &cluster, nil
}

// Create stores a new cluster
func (c *clustersClient) Create(ctx context.Context, cluster *clusters.Cluster) error {
	secName, err := URIToSecretName("cluster", cluster.Server)
	if err != nil {
		return err
	}
	secret := &corev1.Secret{
		Type: corev1.SecretTypeOpaque,
		ObjectMeta: metav1.ObjectMeta{
			Name:      secName,
			Namespace: common.SystemNamespace,
		},
	}

	err = clusterToSecret(cluster, secret)
	if err != nil {
		return fmt.Errorf("failed to convert cluster to secret: %w", err)
	}

	_, err = c.k.CreateSecret(ctx, secret)
	if err != nil {
		return fmt.Errorf("failed to create cluster secret: %w", err)
	}
	return nil
}

// List returns all clusters
func (c *clustersClient) List(ctx context.Context) (*clusters.ClusterList, error) {
	req, err := labels.NewRequirement(clusters.ClusterSecretTypeLabelKey, selection.Equals, []string{clusters.ClusterSecretTypeLabelValue})
	if err != nil {
		return nil, err
	}
	selector := labels.NewSelector().Add(*req)
	secrets, err := c.k.ListSecrets(ctx, ctrlclient.MatchingLabelsSelector{Selector: selector})
	if err != nil {
		return nil, fmt.Errorf("failed to list cluster secrets: %w", err)
	}
	clustersList := &clusters.ClusterList{
		Items: make([]clusters.Cluster, 0, len(secrets.Items)),
	}
	for i := range secrets.Items {
		secret := &secrets.Items[i]
		if secret.Type != corev1.SecretTypeOpaque {
			continue // Skip non-opaque secrets
		}
		cluster, err := SecretToCluster(secret)
		if err != nil {
			return nil, fmt.Errorf("failed to convert secret '%s' to cluster: %w", secret.Name, err)
		}
		clustersList.Items = append(clustersList.Items, *cluster)
	}
	// Add local cluster
	clustersList.Items = append(clustersList.Items, clusters.Cluster{
		Name:   "in-cluster",
		Server: "https://localhost:6443", // FIXME: Replace with actual local cluster server
	})
	return clustersList, nil
}

// Delete removes a cluster
func (c *clustersClient) Delete(ctx context.Context, name string) error {
	return c.k.DeleteSecret(ctx, &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: common.SystemNamespace,
		},
	})
}
