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

	enginefeaturesv1alpha1 "github.com/percona/everest-operator/api/engine-features.everest/v1alpha1"
)

func (h *validateHandler) CreateSplitHorizonDNSConfig(ctx context.Context, shdc *enginefeaturesv1alpha1.SplitHorizonDNSConfig) (*enginefeaturesv1alpha1.SplitHorizonDNSConfig, error) {
	// The validation is performed in the webhook, so we just pass the call to the next handler.
	return h.next.CreateSplitHorizonDNSConfig(ctx, shdc)
}

func (h *validateHandler) UpdateSplitHorizonDNSConfig(ctx context.Context, shdc *enginefeaturesv1alpha1.SplitHorizonDNSConfig) (*enginefeaturesv1alpha1.SplitHorizonDNSConfig, error) {
	return h.next.UpdateSplitHorizonDNSConfig(ctx, shdc)
}

func (h *validateHandler) ListSplitHorizonDNSConfigs(ctx context.Context, namespace string) (*enginefeaturesv1alpha1.SplitHorizonDNSConfigList, error) {
	return h.next.ListSplitHorizonDNSConfigs(ctx, namespace)
}

func (h *validateHandler) DeleteSplitHorizonDNSConfig(ctx context.Context, namespace, name string) error {
	return h.next.DeleteSplitHorizonDNSConfig(ctx, namespace, name)
}

func (h *validateHandler) GetSplitHorizonDNSConfig(ctx context.Context, namespace, name string) (*enginefeaturesv1alpha1.SplitHorizonDNSConfig, error) {
	return h.next.GetSplitHorizonDNSConfig(ctx, namespace, name)
}
