package server

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ListNamespaces returns the current version information.
func (e *EverestServer) ListNamespaces(ctx echo.Context, cluster string) error {
	result, err := e.handler.ListNamespaces(ctx.Request().Context(), cluster)
	if err != nil {
		e.l.Errorf("ListNamespaces failed: %w", err)
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}
