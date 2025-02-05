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

package namespaces

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

var (
	// skipNamespaces is a list of namespaces that cannot be added to Everest management.
	skipNamespaces = []string{
		"kube-system",
		"kube-public",
		common.SystemNamespace,
		common.MonitoringNamespace,
		kubernetes.OLMNamespace,
	}
)

// NamespaceListConfig is the configuration for the  namespace listing operation.
type (
	NamespaceListConfig struct {
		// KubeconfigPath is a path to a kubeconfig
		KubeconfigPath string
		// Pretty if set print the output in pretty mode.
		Pretty bool
		// ListAllNamespaces if set list all namespaces.
		// Note: this flag skips namespaces that cannot be added to Everest management
		// (i.e. Kubernetes system and Everest Core namespaces).
		ListAllNamespaces bool
	}

	NamespaceInfo struct {
		Name string
		// ManagedByEverest bool
		InstalledOperators []string
	}

	// NamespaceLister is the CLI operation to list namespaces.
	NamespaceLister struct {
		cfg        NamespaceListConfig
		kubeClient *kubernetes.Kubernetes
		l          *zap.SugaredLogger
	}
)

// NewNamespaceLister returns a new CLI operation to list namespaces.
func NewNamespaceLister(c NamespaceListConfig, l *zap.SugaredLogger) (*NamespaceLister, error) {
	n := &NamespaceLister{
		cfg: c,
		l:   l.With("component", "namespace-remover"),
	}
	if c.Pretty {
		n.l = zap.NewNop().Sugar()
	}

	k, err := cliutils.NewKubeclient(n.l, n.cfg.KubeconfigPath)
	if err != nil {
		return nil, err
	}
	n.kubeClient = k
	return n, nil
}

// Run the namespace list operation.
func (nsL *NamespaceLister) Run(ctx context.Context) ([]NamespaceInfo, error) {
	var err error
	// This command expects a Helm based installation (< 1.4.0)
	_, err = cliutils.CheckHelmInstallation(ctx, nsL.kubeClient)
	if err != nil {
		return []NamespaceInfo{}, err
	}

	var nsList *corev1.NamespaceList

	nsList, err = nsL.kubeClient.ListNamespaces(ctx, metav1.ListOptions{})
	if err != nil {
		return []NamespaceInfo{}, err
	}

	// filter out namespaces that cannot be added to Everest management
	nsList.Items = slices.DeleteFunc(nsList.Items, func(ns corev1.Namespace) bool {
		return slices.Contains(skipNamespaces, ns.Name)
	})

	if !nsL.cfg.ListAllNamespaces {
		// filter out namespaces that are not managed by Everest
		nsList.Items = slices.DeleteFunc(nsList.Items, func(ns corev1.Namespace) bool {
			return !isManagedByEverest(&ns)
		})
	}

	var toReturn []NamespaceInfo
	for _, ns := range nsList.Items {
		subscriptions, err := nsL.kubeClient.ListSubscriptions(ctx, ns.Name)
		if err != nil {
			return []NamespaceInfo{}, fmt.Errorf("cannot list subscriptions: %w", err)
		}

		nsInfo := NamespaceInfo{Name: ns.Name}
		for _, sub := range subscriptions.Items {
			nsInfo.InstalledOperators = append(nsInfo.InstalledOperators, parseOperator(sub.Status.InstalledCSV))
		}

		toReturn = append(toReturn, nsInfo)
	}
	return toReturn, nil
}

func parseOperator(operatorName string) string {
	// Percona operator name format: percona-server-for-mongodb.v1.0.0
	parts := strings.Split(operatorName, ".v")
	if len(parts) != 2 {
		return operatorName
	}

	switch parts[0] {
	case common.PGOperatorName:
		return fmt.Sprintf("postgresql(v%s)", parts[1])
	case common.PSMDBOperatorName:
		return fmt.Sprintf("psmdb(v%s)", parts[1])
	case common.PXCOperatorName:
		return fmt.Sprintf("pxc(v%s)", parts[1])
	default:
		return fmt.Sprintf("%s(%s)", parts[0], parts[1])
	}
}
