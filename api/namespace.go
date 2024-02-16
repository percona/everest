package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
)

// ListNamespaces returns the current version information.
func (e *EverestServer) ListNamespaces(ctx echo.Context) error {
	namespaces, err := e.kubeClient.GetDBNamespaces(ctx.Request().Context(), e.kubeClient.Namespace())
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to list namespaces"),
		})
	}
	return ctx.JSON(http.StatusOK, namespaces)
}
