package api

import (
	"errors"
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
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to get user from context" + err.Error()),
		})
	}
	// Filter out result based on permission.
	result := make([]string, 0, len(namespaces))
	for _, ns := range namespaces {
		if err := e.enforceOrErr(user, rbac.ResourceNamespaces, rbac.ActionRead, ns); err != nil && errors.Is(err, errInsufficientPermissions) {
			continue
		} else if err != nil {
			return ctx.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString("Failed to check namespace permission"),
			})
		}
		result = append(result, ns)
	}
	return ctx.JSON(http.StatusOK, result)
}
