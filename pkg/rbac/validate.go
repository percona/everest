package rbac

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/casbin/casbin/v2"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
)

var (
	// ErrPolicySyntax is returned when a policy has a syntax error.
	errPolicySyntax = errors.New("policy syntax error")
	// ErrRoleNotFound is returned when a role is not found.
	errRoleNotFound = errors.New("role not found")
)

// ValidatePolicy validates a policy from either Kubernetes or local file.
func ValidatePolicy(ctx context.Context, k *kubernetes.Kubernetes, filepath string) error {
	enforcer, err := newKubeOrFileEnforcer(ctx, k, filepath)
	if err != nil {
		return errors.Join(errPolicySyntax, err)
	}

	// check basic policy syntax.
	policy := enforcer.GetPolicy()
	for _, policy := range policy {
		if err := validateTerms(policy); err != nil {
			return errors.Join(errPolicySyntax, err)
		}
	}

	// ensure that non-existent roles are not used.
	roles := enforcer.GetAllRoles()
	if err := checkRoles(roles, policy); err != nil {
		return errors.Join(errRoleNotFound, err)
	}
	return nil
}

func checkRoles(roles []string, policies [][]string) error {
	for _, policy := range policies {
		roleName := policy[0]
		if !strings.HasSuffix(roleName, ":role") {
			continue
		}
		if !slices.Contains(roles, roleName) {
			return fmt.Errorf("role %s is invalid", roleName)
		}
	}
	return nil
}

func validateTerms(terms []string) error {
	pattern := `^[/*-_:a-zA-Z0-9]+$`
	compiled := regexp.MustCompile(pattern)
	for _, term := range terms {
		if !compiled.MatchString(term) {
			return fmt.Errorf("invalid policy term: %s", term)
		}
	}
	return nil
}

//nolint:nonamedreturns
func newKubeOrFileEnforcer(
	ctx context.Context,
	kubeClient *kubernetes.Kubernetes,
	filePath string,
) (e *casbin.Enforcer, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
			e = nil
		}
	}()
	if filePath != "" {
		return NewEnforcerFromFilePath(filePath)
	}
	return NewEnforcer(ctx, kubeClient, zap.NewNop().Sugar())
}
