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

package client

type (
	// Cluster contains information about how to communicate with a kubernetes cluster.
	Cluster struct {
		CertificateAuthorityData []byte `json:"certificate-authority-data"` //nolint:tagliatelle
		Server                   string `json:"server"`
	}
	// ClusterInfo is a struct used to parse Cluster config from kubeconfig.
	ClusterInfo struct {
		Name    string  `json:"name"`
		Cluster Cluster `json:"cluster"`
	}
	// User contains information that describes identity information.
	// This is use to tell the kubernetes cluster who you are.
	User struct {
		Token string `json:"token"`
	}
	// UserInfo is a struct used to parse User config from kubeconfig.
	UserInfo struct {
		Name string `json:"name"`
		User User   `json:"user"`
	}
	// Context is a tuple of references to a cluster (how do I communicate with a kubernetes cluster),
	// a user (how do I identify myself), and a namespace (what subset of resources do I want to work with).
	Context struct {
		Cluster   string `json:"cluster"`
		User      string `json:"user"`
		Namespace string `json:"namespace"`
	}
	// ContextInfo is a struct used to parse Context config from kubeconfig.
	ContextInfo struct {
		Name    string  `json:"name"`
		Context Context `json:"context"`
	}
	// Config holds the information needed to build connect to remote kubernetes clusters as a given user.
	Config struct {
		// Legacy field from pkg/api/types.go TypeMeta.
		Kind string `json:"kind,omitempty"`
		// Legacy field from pkg/api/types.go TypeMeta.
		APIVersion string `json:"apiVersion,omitempty"`
		// Preferences holds general information to be use for cli interactions
		Clusters []ClusterInfo `json:"clusters"`
		// AuthInfos is a map of referencable names to user configs
		Users []UserInfo `json:"users"`
		// Contexts is a map of referencable names to context configs
		Contexts []ContextInfo `json:"contexts"`
		// CurrentContext is the name of the context that you would like to use by default
		CurrentContext string `json:"current-context"` //nolint:tagliatelle
	}
)
