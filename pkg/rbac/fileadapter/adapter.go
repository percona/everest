// Package fileadapter provides a file adapter for Casbin.
package fileadapter

import (
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/casbin/casbin/v2/model"
	"gopkg.in/yaml.v3"
	corev1 "k8s.io/api/core/v1"

	rbacutils "github.com/percona/everest/pkg/rbac/utils"
)

// Adapter is the file adapter for Casbin.
type Adapter struct {
	content string
}

// New returns a new adapter that reads a policy located at the given path.
func New(path string) (*Adapter, error) {
	f, err := os.Open(path) //nolint:gosec
	if err != nil {
		return nil, err
	}
	defer f.Close() //nolint:errcheck

	content, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}

	// Retrieve the policy based on the file extension.
	var policy string
	if strings.HasSuffix(path, ".yaml") {
		cm := corev1.ConfigMap{}
		if err := yaml.Unmarshal(content, &cm); err != nil {
			return nil, fmt.Errorf("failed to unmarsal yaml: %w", err)
		}
		s, ok := cm.Data["policy.csv"]
		if !ok {
			return nil, errors.New("policy.csv not found in ConfigMap")
		}
		policy = s
	} else if strings.HasSuffix(path, ".csv") {
		policy = string(content)
	} else {
		return nil, errors.New("unsupported file format")
	}

	return &Adapter{
		content: policy,
	}, nil
}

// LoadPolicy loads all policy rules from the storage.
func (a *Adapter) LoadPolicy(model model.Model) error {
	strs := strings.Split(a.content, "\n")
	for _, str := range strs {
		if str == "" {
			continue
		}
		if err := rbacutils.LoadPolicyLine(str, model); err != nil {
			return err
		}
	}
	return nil
}

// SavePolicy saves all policy rules to the storage.
func (a *Adapter) SavePolicy(_ model.Model) error {
	return errors.New("not implemented")
}

// AddPolicy adds a policy rule to the storage.
func (a *Adapter) AddPolicy(_ string, _ string, _ []string) error {
	return errors.New("not implemented")
}

// RemovePolicy removes a policy rule from the storage.
func (a *Adapter) RemovePolicy(_ string, _ string, _ []string) error {
	return errors.New("not implemented")
}

// RemoveFilteredPolicy removes policy rules that match the filter from the storage.
func (a *Adapter) RemoveFilteredPolicy(_ string, _ string, _ int, _ ...string) error {
	return errors.New("not implemented")
}
