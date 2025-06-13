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

package k8s

import (
	"context"
	"fmt"
	"slices"

	"github.com/AlekSi/pointer"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *k8sHandler) CreatePodSchedulingPolicy(ctx context.Context, cluster string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	return connector.CreatePodSchedulingPolicy(ctx, psp)
}

func (h *k8sHandler) UpdatePodSchedulingPolicy(ctx context.Context, cluster string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	return connector.UpdatePodSchedulingPolicy(ctx, psp)
}

func (h *k8sHandler) ListPodSchedulingPolicies(ctx context.Context, cluster string, params *api.ListPodSchedulingPolicyParams) (*everestv1alpha1.PodSchedulingPolicyList, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	pspList, err := connector.ListPodSchedulingPolicies(ctx)
	if err != nil {
		return pspList, err
	}

	if params != nil {
		if engineType := everestv1alpha1.EngineType(pointer.Get(params.EngineType)); engineType != "" {
			// filter out PodSchedulingPolicies that do not match a requested engine type
			pspList.Items = slices.DeleteFunc(pspList.Items, func(psp everestv1alpha1.PodSchedulingPolicy) bool {
				return psp.Spec.EngineType != engineType
			})
		}

		if pointer.Get(params.HasRules) {
			// filter out PodSchedulingPolicies that do not have rules
			pspList.Items = slices.DeleteFunc(pspList.Items, func(psp everestv1alpha1.PodSchedulingPolicy) bool {
				return !psp.HasRules()
			})
		}
	}
	return pspList, err
}

func (h *k8sHandler) DeletePodSchedulingPolicy(ctx context.Context, cluster, name string) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	used, err := connector.IsPodSchedulingPolicyUsed(ctx, types.NamespacedName{Name: name})
	if err != nil {
		return err
	}
	if used {
		return fmt.Errorf("the pod scheduling poicy='%s' is in use. Unassign the policy first", name)
	}

	delObj := &everestv1alpha1.PodSchedulingPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}
	return connector.DeletePodSchedulingPolicy(ctx, delObj)
}

func (h *k8sHandler) GetPodSchedulingPolicy(ctx context.Context, cluster, name string) (*everestv1alpha1.PodSchedulingPolicy, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	return connector.GetPodSchedulingPolicy(ctx, types.NamespacedName{Name: name})
}
