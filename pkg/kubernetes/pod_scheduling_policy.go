// everest
// Copyright (C) 2025 Percona LLC
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
	"context"

	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	PodSchedulingPolicyNameLabel = "podSchedulingPolicyName"
)

// ListPodSchedulingPolicies returns a list of pod scheduling policy that matches the criteria.
// This method returns a list of full objects (meta and spec).
func (k *Kubernetes) ListPodSchedulingPolicies(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.PodSchedulingPolicyList, error) {
	result := &everestv1alpha1.PodSchedulingPolicyList{}
	if err := k.k8sClient.List(ctx, result, opts...); err != nil {
		return nil, err
	}
	return result, nil
}

// GetPodSchedulingPolicy returns pod scheduling policy that matches the criteria.
func (k *Kubernetes) GetPodSchedulingPolicy(ctx context.Context, key ctrlclient.ObjectKey) (*everestv1alpha1.PodSchedulingPolicy, error) {
	result := &everestv1alpha1.PodSchedulingPolicy{}
	if err := k.k8sClient.Get(ctx, key, result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeletePodSchedulingPolicy deletes pod scheduling policy that matches the criteria.
func (k *Kubernetes) DeletePodSchedulingPolicy(ctx context.Context, obj *everestv1alpha1.PodSchedulingPolicy) error {
	return k.k8sClient.Delete(ctx, obj)
}

// CreatePodSchedulingPolicy creates pod scheduling policy.
func (k *Kubernetes) CreatePodSchedulingPolicy(ctx context.Context, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	if err := k.k8sClient.Create(ctx, psp); err != nil {
		return nil, err
	}
	return psp, nil
}

// UpdatePodSchedulingPolicy updates pod scheduling policy.
func (k *Kubernetes) UpdatePodSchedulingPolicy(ctx context.Context, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	if err := k.k8sClient.Update(ctx, psp); err != nil {
		return nil, err
	}
	return psp, nil
}

// IsPodSchedulingPolicyUsed checks if any database cluster uses a pod scheduling policy that matches the criteria.
func (k *Kubernetes) IsPodSchedulingPolicyUsed(ctx context.Context, key ctrlclient.ObjectKey) (bool, error) {
	_, err := k.GetPodSchedulingPolicy(ctx, key)
	if err != nil {
		return false, err
	}

	list, err := k.listDatabaseClustersMeta(ctx, ctrlclient.MatchingLabels{PodSchedulingPolicyNameLabel: key.Name})
	if err != nil {
		return false, err
	}
	if list != nil && len(list.Items) > 0 {
		return true, nil
	}

	return false, nil
}
