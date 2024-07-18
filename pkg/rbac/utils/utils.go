// Package utils contains utility functions for RBAC.
package utils

import (
	"encoding/csv"
	"fmt"
	"strings"

	"github.com/casbin/casbin/v2/model"
	"github.com/casbin/casbin/v2/persist"
)

const (
	numFieldsPolicyLine = 2
)

// LoadPolicyLine loads a text line as a policy rule to model.
//
// This function is copied (and modified) from https://github.com/casbin/casbin/blob/71c8c84e300cf8b276f28e21e555a39ad793d65c/persist/adapter.go#L25.
// The original function is missing certain validations that leads to panics.
func LoadPolicyLine(line string, m model.Model) error {
	if line == "" || strings.HasPrefix(line, "#") {
		return nil
	}

	r := csv.NewReader(strings.NewReader(line))
	r.Comma = ','
	r.Comment = '#'
	r.TrimLeadingSpace = true

	tokens, err := r.Read()
	if err != nil {
		return err
	}

	if len(tokens) < numFieldsPolicyLine {
		return fmt.Errorf("invalid policy line '%s'", line)
	}
	if tokens[0] != "p" && tokens[0] != "g" {
		return fmt.Errorf("invalid policy line '%s'", line)
	}

	return persist.LoadPolicyArray(tokens, m)
}
