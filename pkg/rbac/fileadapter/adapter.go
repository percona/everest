// Package fileadapter provides a file adapter for Casbin.
package fileadapter

import (
	"errors"
	"io"
	"os"
	"strings"

	"github.com/casbin/casbin/v2/model"

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

	return &Adapter{
		content: string(content),
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
