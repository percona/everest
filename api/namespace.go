package api

import (
	"fmt"
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"

	"github.com/percona/everest/pkg/rbac"
)

// ListNamespaces returns the current version information.
func (e *EverestServer) ListNamespaces(ctx echo.Context) error {
	namespaces, err := e.kubeClient.GetDBNamespaces(ctx.Request().Context())
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to list namespaces"),
		})
	}
	// Filter out result based on permission.
	result := make([]string, 0, len(namespaces))
	for _, ns := range namespaces {
		if can, err := e.canReadNamespace(ctx, ns); err != nil {
			e.l.Error(err)
			return ctx.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString("Failed to check namespace permission"),
			})
		} else if can {
			result = append(result, ns)
		}
	}
	return ctx.JSON(http.StatusOK, result)
}

// canReadNamespace checks if the user has permission to read the namespace.
func (e *EverestServer) canReadNamespace(ctx echo.Context, namespace string) (bool, error) {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to GetUser: %w", err)
	}
	ok, err := e.rbacEnforcer.Enforce(
		user, rbac.ResourceNamespaces,
		rbac.ActionRead,
		namespace,
	)
	if err != nil {
		return false, fmt.Errorf("failed to Enforce: %w", err)
	}
	return ok, nil
}
