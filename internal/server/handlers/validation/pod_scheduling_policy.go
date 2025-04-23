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

package validation

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// CreatePodSchedulingPolicy creates a new pod scheduling policy.
func (h *validateHandler) CreatePodSchedulingPolicy(ctx context.Context, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	return h.next.CreatePodSchedulingPolicy(ctx, psp)
}

// UpdatePodSchedulingPolicy updates an existing pod scheduling policy.
func (h *validateHandler) UpdatePodSchedulingPolicy(ctx context.Context, name string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	return h.next.UpdatePodSchedulingPolicy(ctx, name, psp)
}

// ListPodSchedulingPolicies lists all pod scheduling policies.
func (h *validateHandler) ListPodSchedulingPolicies(ctx context.Context) (*everestv1alpha1.PodSchedulingPolicyList, error) {
	return h.next.ListPodSchedulingPolicies(ctx)
}

// DeletePodSchedulingPolicy deletes a pod scheduling policy.
func (h *validateHandler) DeletePodSchedulingPolicy(ctx context.Context, name string) error {
	return h.next.DeletePodSchedulingPolicy(ctx, name)
}

// GetPodSchedulingPolicy retrieves a pod scheduling policy by name.
func (h *validateHandler) GetPodSchedulingPolicy(ctx context.Context, name string) (*everestv1alpha1.PodSchedulingPolicy, error) {
	return h.next.GetPodSchedulingPolicy(ctx, name)
}
