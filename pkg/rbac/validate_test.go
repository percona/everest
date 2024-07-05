package rbac

import (
	"context"
	"fmt"
	"testing"
)

func TestValidatePolicy(t *testing.T) {
	testcases := []struct {
		path    string
		isValid bool
	}{
		{
			path:    "./testdata/policy-1-good.csv",
			isValid: true,
		},
		{
			path:    "./testdata/policy-2-bad.csv",
			isValid: false,
		},
	}

	ctx := context.Background()
	for i, tc := range testcases {
		t.Run(fmt.Sprintf("test-%d", i), func(t *testing.T) {
			err := ValidatePolicy(ctx, nil, tc.path)
			if tc.isValid && err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if !tc.isValid && err == nil {
				t.Errorf("expected error, got nil")
			}
		})
	}
}
