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

// Package kubernetes ...
package kubernetes

import (
	rbac "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateRole creates a new role.
func (k *Kubernetes) CreateRole(namespace, name string, rules []rbac.PolicyRule) error {
	m := &rbac.Role{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "Role",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Rules: rules,
	}

	return k.client.ApplyObject(m)
}

// CreateRoleBinding binds a role to a service account.
func (k *Kubernetes) CreateRoleBinding(namespace, name, roleName, serviceAccountName string) error {
	m := &rbac.RoleBinding{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "RoleBinding",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		RoleRef: rbac.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     roleName,
		},
		Subjects: []rbac.Subject{{
			Kind: "ServiceAccount",
			Name: serviceAccountName,
		}},
	}

	return k.client.ApplyObject(m)
}

// CreateClusterRole creates a new cluster role.
func (k *Kubernetes) CreateClusterRole(name string, rules []rbac.PolicyRule) error {
	m := &rbac.ClusterRole{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "ClusterRole",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		Rules: rules,
	}

	return k.client.ApplyObject(m)
}

// CreateClusterRoleBinding binds a cluster role to a service account.
func (k *Kubernetes) CreateClusterRoleBinding(namespace, name, roleName, serviceAccountName string) error {
	m := &rbac.ClusterRoleBinding{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "ClusterRoleBinding",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		RoleRef: rbac.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     roleName,
		},
		Subjects: []rbac.Subject{{
			Kind:      "ServiceAccount",
			Name:      serviceAccountName,
			Namespace: namespace,
		}},
	}

	return k.client.ApplyObject(m)
}
