package rbac

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
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
		{
			path: "./testdata/policy-6-bad.csv",
			err:  errPolicySyntax,
		},
		{
			path: "./testdata/policy-7-bad.csv",
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

func TestCheckRoles(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		roles    []string
		policies [][]string
		valid    bool
	}{
		{
			roles: []string{"admin:role", "viewer:role"},
			policies: [][]string{
				{"admin:role", "database-clusters", "create", "*"},
				{"admin:role", "monitoring-instances", "*", "*"},
			},
			valid: true,
		},
		{
			roles: []string{"admin:role", "viewer:role"},
			policies: [][]string{
				{"admin:role", "database-clusters", "create", "*"},
				{"admin:role", "monitoring-instances", "*", "*"},
				{"does-not-exist:role", "monitoring-instances", "*", "*"},
			},
			valid: false,
		},
	}

	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			t.Parallel()
			err := checkRoles(tc.roles, tc.policies)
			if err != nil && tc.valid {
				t.Fatalf("expected no error, got %v", err)
			}
			if err == nil && !tc.valid {
				t.Fatalf("expected error, got nil")
			}
		})
	}
}

func TestValidateTerms(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		terms []string
		valid bool
	}{
		{
			terms: []string{"admin:role", "database-clusters", "create", "*"},
			valid: true,
		},
		{
			terms: []string{"admin!!:role", "database-clusters", "create", "*"},
			valid: false,
		},
		{
			terms: []string{"admin!!:role", "database clusters", "create", "*"},
			valid: false,
		},
		{
			terms: []string{"admin!!:role", "", "create", "*"},
			valid: false,
		},
	}

	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			t.Parallel()
			err := validateTerms(tc.terms)
			if err != nil && tc.valid {
				t.Fatalf("expected no error, got %v", err)
			}
			if err == nil && !tc.valid {
				t.Fatalf("expected error, got nil")
			}
		})
	}
}

func TestCan(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		request []string
		can     bool
	}{
		{
			request: []string{
				"admin",
				"create",
				"database-clusters",
				"*",
			},
			can: true,
		},
		{
			request: []string{
				"admin",
				"read",
				"database-clusters",
				"*",
			},
			can: true,
		},
		{
			request: []string{
				"admin",
				"update",
				"database-clusters",
				"*",
			},
			can: true,
		},
		{
			request: []string{
				"admin",
				"update",
				"database-cluster-backups",
				"*",
			},
			can: true,
		},
		{
			request: []string{
				"alice",
				"create",
				"database-clusters",
				"*",
			},
			can: false,
		},
		{
			request: []string{
				"alice",
				"read",
				"database-engines",
				"*",
			},
			can: true,
		},
		{
			request: []string{
				"alice",
				"create",
				"database-clusters",
				"alice/alice-cluster-1",
			},
			can: true,
		},
		{
			request: []string{
				"bob",
				"create",
				"database-clusters",
				"*",
			},
			can: false,
		},
		{
			request: []string{
				"bob",
				"create",
				"database-clusters",
				"dev/*",
			},
			can: true,
		},
		{
			request: []string{
				"bob",
				"create",
				"database-clusters",
				"dev/bob-1",
			},
			can: true,
		},
	}

	ctx := context.Background()
	m, err := New(ctx, &Options{
		Filepath: "./testdata/policy-1-good.csv",
		Logger:   zap.NewNop().Sugar(),
	})
	require.NoError(t, err)

	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			t.Parallel()
			can, err := m.Can(ctx, tc.request[0], tc.request[1], tc.request[2], tc.request[3])
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if can != tc.can {
				t.Fatalf("expected %v, got %v", tc.can, can)
			}
		})
	}
}
