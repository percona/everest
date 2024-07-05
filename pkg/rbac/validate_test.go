package rbac

import (
	"context"
	"fmt"
	"testing"

	"github.com/spf13/afero"
)

const policyGood = `p, adminrole:role, namespaces, read, *
p, adminrole:role, database-engines, *, */*
p, adminrole:role, monitoring-instances, *, */*
g, admin, adminrole:role`

const policyBad = `p, adminrole:role, namespaces, read, *
this is a bad policy
g, admin, adminrole:role
`

func TestValidatePolicy(t *testing.T) {
	testcases := []struct {
		policy  string
		isValid bool
	}{
		{
			policy:  policyGood,
			isValid: true,
		},
		{
			policy:  policyBad,
			isValid: false,
		},
	}

	// prepare a mock filesystem.
	testFS := afero.NewMemMapFs()
	for i, tc := range testcases {
		afero.WriteFile(testFS, fmt.Sprintf("policy_%d.csv", i), []byte(tc.policy), 0644)
	}

	// run tests.
	ctx := context.Background()
	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			err := ValidatePolicy(ctx, nil, fmt.Sprintf("policy_%d.csv", i))
			if tc.isValid && err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if !tc.isValid && err == nil {
				t.Errorf("expected error, got nil")
			}
		})
	}
}
