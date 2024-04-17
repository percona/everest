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
	"context"
	"errors"
	"fmt"

	goversion "github.com/hashicorp/go-version"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ErrOperatorNotInstalled is returned when an operator is not installed.
var ErrOperatorNotInstalled = fmt.Errorf("operatorNotInstalled")

// OperatorInstalledVersion returns the installed version of operator by name.
func (k *Kubernetes) OperatorInstalledVersion(ctx context.Context, namespace, name string) (*goversion.Version, error) {
	sub, err := k.client.OLM().OperatorsV1alpha1().Subscriptions(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, errors.Join(ErrOperatorNotInstalled, errors.New("could not retrieve subscription"))
		}
		return nil, errors.Join(err, errors.New("could not retrieve subscription"))
	}

	csvName := sub.Status.InstalledCSV
	if csvName == "" {
		return nil, ErrOperatorNotInstalled
	}

	csv, err := k.client.OLM().OperatorsV1alpha1().ClusterServiceVersions(namespace).Get(ctx, csvName, metav1.GetOptions{})
	if err != nil {
		return nil, errors.Join(err, errors.New("could not retrieve cluster service version"))
	}

	return goversion.NewVersion(csv.Spec.Version.FinalizeVersion())
}

// GetIsDBUpdateLocked returns true if updating the DB is locked.
func (k *Kubernetes) GetIsDBUpdateLocked(ctx context.Context, namespace, name string) (bool, error) {
	dbc, err := k.client.GetDatabaseCluster(ctx, namespace, name)
	if err != nil {
		return false, err
	}
	return k.client.IsOperatorUpgrading(ctx, namespace, dbc.Spec.Engine.Type)
}
