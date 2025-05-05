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
	"errors"
	"fmt"
	"slices"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/utils"
)

// CreatePodSchedulingPolicy creates a new pod scheduling policy.
func (h *validateHandler) CreatePodSchedulingPolicy(ctx context.Context, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	if err := h.validatePSPCR(psp); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	// validate new policy params
	if err := h.validatePSPOnCreate(ctx, psp); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	return h.next.CreatePodSchedulingPolicy(ctx, psp)
}

// UpdatePodSchedulingPolicy updates an existing pod scheduling policy.
func (h *validateHandler) UpdatePodSchedulingPolicy(ctx context.Context, name string, psp *everestv1alpha1.PodSchedulingPolicy) (*everestv1alpha1.PodSchedulingPolicy, error) {
	if err := h.validatePSPCR(psp); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	// validate updated policy params
	if err := h.validatePSPOnUpdate(ctx, psp); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, err
		}
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	return h.next.UpdatePodSchedulingPolicy(ctx, name, psp)
}

// ListPodSchedulingPolicies lists all pod scheduling policies.
func (h *validateHandler) ListPodSchedulingPolicies(ctx context.Context, params *api.ListPodSchedulingPolicyParams) (*everestv1alpha1.PodSchedulingPolicyList, error) {
	return h.next.ListPodSchedulingPolicies(ctx, params)
}

// DeletePodSchedulingPolicy deletes a pod scheduling policy.
func (h *validateHandler) DeletePodSchedulingPolicy(ctx context.Context, name string) error {
	if err := h.validatePSPOnDelete(ctx, name); err != nil {
		if k8serrors.IsNotFound(err) {
			return err
		}
		return errors.Join(ErrInvalidRequest, err)
	}
	return h.next.DeletePodSchedulingPolicy(ctx, name)
}

// GetPodSchedulingPolicy retrieves a pod scheduling policy by name.
func (h *validateHandler) GetPodSchedulingPolicy(ctx context.Context, name string) (*everestv1alpha1.PodSchedulingPolicy, error) {
	return h.next.GetPodSchedulingPolicy(ctx, name)
}

func (h *validateHandler) validatePSPCR(psp *everestv1alpha1.PodSchedulingPolicy) error {
	if psp.GetNamespace() != common.SystemNamespace {
		return fmt.Errorf("invalid namespace '%s': pod scheduling policy must be in '%s' namespace only", psp.GetNamespace(), common.SystemNamespace)
	}

	if err := utils.ValidateRFC1035(psp.GetName(), "metadata.name"); err != nil {
		return err
	}

	_, ok := common.OperatorTypeToName[psp.Spec.EngineType]
	if !ok {
		return fmt.Errorf("unsupported .spec.engineType='%s'", psp.Spec.EngineType)
	}

	// The following cases are possible:
	// - policy is created without affinityConfig. In such a case only .metadata.name and .spec.engineType are set.
	// This is exactly how UI behaves - creates an empty policy and later adds affinity rules into it one by one.
	// - policy is created with all required fields filled at once.
	affinityConfig := psp.Spec.AffinityConfig
	if affinityConfig == nil {
		return nil
	}

	// affinityConfig is passed - need to validate it.
	switch psp.Spec.EngineType {
	case everestv1alpha1.DatabaseEnginePXC:
		if affinityConfig.PSMDB != nil {
			// .spec.affinityConfig.psmdb shall not be set with engineType=pxc
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)
		}
		if affinityConfig.PostgreSQL != nil {
			// .spec.affinityConfig.postgresql shall not be set with engineType=pxc
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePXC)
		}
		if affinityConfig.PXC == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.pxc is required")
		}
		if affinityConfig.PXC.Engine == nil && affinityConfig.PXC.Proxy == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.pxc.engine or .spec.affinityConfig.pxc.proxy is required")
		}
	case everestv1alpha1.DatabaseEnginePSMDB:
		if affinityConfig.PXC != nil {
			// .spec.affinityConfig.pxc shall not be set with engineType=psmdb
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)
		}
		if affinityConfig.PostgreSQL != nil {
			// .spec.affinityConfig.postgresql shall not be set with engineType=psmdb
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.postgresql is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePSMDB)
		}
		if affinityConfig.PSMDB == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.psmdb is required")
		}
		if affinityConfig.PSMDB.Engine == nil && affinityConfig.PSMDB.Proxy == nil && affinityConfig.PSMDB.ConfigServer == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.psmdb.engine or .spec.affinityConfig.psmdb.proxy or .spec.affinityConfig.psmdb.configServer is required")
		}
	case everestv1alpha1.DatabaseEnginePostgresql:
		if affinityConfig.PXC != nil {
			// .spec.affinityConfig.pxc shall not be set with engineType=postgresql
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.pxc is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)
		}
		if affinityConfig.PSMDB != nil {
			// .spec.affinityConfig.psmdb shall not be set with engineType=postgresql
			return fmt.Errorf("invalid affinity config: .spec.affinityConfig.psmdb is not applicable with engineType='%s'", everestv1alpha1.DatabaseEnginePostgresql)
		}
		if affinityConfig.PostgreSQL == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.postgresql is required")
		}
		if affinityConfig.PostgreSQL.Engine == nil && affinityConfig.PostgreSQL.Proxy == nil {
			return errors.New("invalid affinity config: .spec.affinityConfig.postgresql.engine or .spec.affinityConfig.postgresql.proxy is required")
		}
	}
	return nil
}

func (h *validateHandler) validatePSPOnCreate(ctx context.Context, newPsp *everestv1alpha1.PodSchedulingPolicy) error {
	if existingPolicy, err := h.kubeConnector.GetPodSchedulingPolicy(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: newPsp.GetName()}); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil
		}

		if !k8serrors.IsNotFound(err) {
			h.log.Errorf("failed to check if pod scheduling policy with name='%s' already exists: %v", newPsp.GetName(), err)
			return fmt.Errorf("failed to check if pod scheduling policy with name='%s' already exists: %w", newPsp.GetName(), err)
		}
	} else if existingPolicy.GetName() != "" {
		return fmt.Errorf("pod scheduling policy with name='%s' already exists", newPsp.GetName())
	}
	return nil
}

func (h *validateHandler) validatePSPOnUpdate(ctx context.Context, newPsp *everestv1alpha1.PodSchedulingPolicy) error {
	var oldPsp *everestv1alpha1.PodSchedulingPolicy
	var err error
	if oldPsp, err = h.kubeConnector.GetPodSchedulingPolicy(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: newPsp.GetName()}); err != nil {
		if k8serrors.IsNotFound(err) {
			return err
		}
		h.log.Errorf("failed to check if pod scheduling policy with name='%s' exists: %v", newPsp.GetName(), err)
		return fmt.Errorf("failed to check if pod scheduling policy with name='%s' exists: %w", newPsp.GetName(), err)
	}

	if h.isDefaultPSP(oldPsp) {
		// default policy update is not allowed
		return fmt.Errorf("pod scheduling policy with name='%s' is default and cannot be updated", newPsp.GetName())
	}

	if oldPsp.Spec.EngineType != newPsp.Spec.EngineType {
		// changing .spec.engineType is not allowed
		return errors.New("changing .spec.engineType is forbidden")
	}
	return nil
}

func (h *validateHandler) validatePSPOnDelete(ctx context.Context, pspName string) error {
	var psp *everestv1alpha1.PodSchedulingPolicy
	var err error
	if psp, err = h.kubeConnector.GetPodSchedulingPolicy(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: pspName}); err != nil {
		if k8serrors.IsNotFound(err) {
			return err
		}
		h.log.Errorf("failed to check if pod scheduling policy with name='%s' exists: %v", pspName, err)
		return fmt.Errorf("failed to check if pod scheduling policy with name='%s' exists: %w", pspName, err)
	}

	if h.isDefaultPSP(psp) {
		// default policy deletion is not allowed
		return fmt.Errorf("pod scheduling policy with name='%s' is default and cannot be deleted", psp.GetName())
	}

	if slices.Contains(psp.GetFinalizers(), everestv1alpha1.UsedResourceFinalizer) {
		// policy is used by some DB cluster
		return fmt.Errorf("pod scheduling policy with name='%s' is used by some DB cluster and cannot be deleted", psp.GetName())
	}
	return nil
}

func (h *validateHandler) isDefaultPSP(psp *everestv1alpha1.PodSchedulingPolicy) bool {
	return slices.Contains(psp.GetFinalizers(), everestv1alpha1.ReadOnlyFinalizer)
}
