package rbac

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

func TestValidatePolicy(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		path string
		err  error
	}{
		{
			path: "./testdata/policy-1-good.csv",
			err:  nil,
		},
		{
			path: "./testdata/policy-2-bad.csv",
			err:  errPolicySyntax,
		},
		{
			path: "./testdata/policy-3-bad.csv",
			err:  errPolicySyntax,
		},
		{
			path: "./testdata/policy-4-bad.csv",
			err:  errPolicySyntax,
		},
		{
			path: "./testdata/policy-5-bad.csv",
			err:  errPolicySyntax,
		},
	}

	ctx := context.Background()
	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			t.Parallel()
			err := ValidatePolicy(ctx, nil, tc.path)
			if err != nil && tc.err == nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if err == nil && tc.err != nil {
				t.Fatalf("expected error %v, got nil", tc.err)
			}
			if !errors.Is(err, tc.err) {
				t.Fatalf("unexpected error %v", err)
			}
		})
	}
}

func TestCheckResourceNames(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		policies [][]string
		valid    bool
	}{
		{
			policies: [][]string{
				{"admin:role", "database-clusters", "create", "*"},
				{"admin:role", "monitoring-instances", "*", "*"},
			},
			valid: true,
		},
		{
			policies: [][]string{
				{"admin:role", "database-clusters", "create", "*"},
				{"admin:role", "monitoring-instances", "*", "*"},
				{"admin:role", "does-not-exist", "*", "*"},
			},
			valid: false,
		},
	}

	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			t.Parallel()
			err := checkResourceNames(tc.policies)
			if err != nil && tc.valid {
				t.Fatalf("expected no error, got %v", err)
			}
			if err == nil && !tc.valid {
				t.Fatalf("expected error, got nil")
			}
		})
	}
}
