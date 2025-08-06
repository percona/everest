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

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/utils"
)

var (
	// Default configs errors
	errUpdateDefaultLBC = func(name string) error {
		return fmt.Errorf("load balancer config with name='%s' is default and cannot be updated", name)
	}
	errDeleteDefaultLBC = func(name string) error {
		return fmt.Errorf("load balancer config with name='%s' is default and cannot be deleted", name)
	}
	// Used config error
	errDeleteInUseLBC = func(name string) error {
		return fmt.Errorf("load balancer config with name='%s' is used by some DB cluster and cannot be deleted", name)
	}
)

// CreateLoadBalancerConfig creates a new load balancer config.
func (h *validateHandler) CreateLoadBalancerConfig(ctx context.Context, lbc *everestv1alpha1.LoadBalancerConfig) (*everestv1alpha1.LoadBalancerConfig, error) {
	if err := h.validateLBCCR(lbc); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	return h.next.CreateLoadBalancerConfig(ctx, lbc)
}

// UpdateLoadBalancerConfig updates an existing load balancer config.
func (h *validateHandler) UpdateLoadBalancerConfig(ctx context.Context, lbc *everestv1alpha1.LoadBalancerConfig) (*everestv1alpha1.LoadBalancerConfig, error) {
	if err := h.validateLBCCR(lbc); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	// validate updated config params
	if err := h.validateLBCOnUpdate(ctx, lbc); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, err
		}
		return nil, errors.Join(ErrInvalidRequest, err)
	}

	return h.next.UpdateLoadBalancerConfig(ctx, lbc)
}

// ListLoadBalancerConfigs lists all load balancer configs.
func (h *validateHandler) ListLoadBalancerConfigs(ctx context.Context) (*everestv1alpha1.LoadBalancerConfigList, error) {
	return h.next.ListLoadBalancerConfigs(ctx)
}

// DeleteLoadBalancerConfig deletes a load balancer config.
func (h *validateHandler) DeleteLoadBalancerConfig(ctx context.Context, name string) error {
	if err := h.validateLBCOnDelete(ctx, name); err != nil {
		if k8serrors.IsNotFound(err) {
			return err
		}
		return errors.Join(ErrInvalidRequest, err)
	}
	return h.next.DeleteLoadBalancerConfig(ctx, name)
}

// GetLoadBalancerConfig retrieves a load balancer config by name.
func (h *validateHandler) GetLoadBalancerConfig(ctx context.Context, name string) (*everestv1alpha1.LoadBalancerConfig, error) {
	return h.next.GetLoadBalancerConfig(ctx, name)
}

func (h *validateHandler) validateLBCCR(lbc *everestv1alpha1.LoadBalancerConfig) error {
	if err := utils.ValidateRFC1035(lbc.GetName(), "metadata.name"); err != nil {
		return err
	}
	return nil
}

func (h *validateHandler) validateLBCOnUpdate(ctx context.Context, newLbc *everestv1alpha1.LoadBalancerConfig) error {
	var oldLbc *everestv1alpha1.LoadBalancerConfig
	var err error
	if oldLbc, err = h.kubeConnector.GetLoadBalancerConfig(ctx, types.NamespacedName{Name: newLbc.GetName()}); err != nil {
		return err
	}

	if h.isEverestReadOnlyObject(oldLbc) {
		// default config update is not allowed
		return errUpdateDefaultLBC(newLbc.GetName())
	}

	return nil
}

func (h *validateHandler) validateLBCOnDelete(ctx context.Context, lbcName string) error {
	var lbc *metav1.PartialObjectMetadata
	var err error
	if lbc, err = h.kubeConnector.GetLoadBalancerConfigMeta(ctx, types.NamespacedName{Name: lbcName}); err != nil {
		return err
	}

	if h.isEverestReadOnlyObject(lbc) {
		// default config deletion is not allowed
		return errDeleteDefaultLBC(lbc.GetName())
	}

	if h.isEverestObjectInUse(lbc) {
		// config is used by some DB cluster
		return errDeleteInUseLBC(lbc.GetName())
	}
	return nil
}
