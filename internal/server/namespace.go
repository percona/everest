package server

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/percona/everest/pkg/rbac"
)

// ListNamespaces returns the current version information.
func (e *EverestServer) ListNamespaces(ctx echo.Context) error {
	user, err := rbac.GetUser(ctx)
	if err != nil {
		return errors.Join(errFailedToGetUser, err)
	}

	result, err := e.handler.ListNamespaces(ctx.Request().Context(), user)
	if err != nil {
		e.l.Errorf("ListNamespaces failed: %w", err)
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}
