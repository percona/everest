package server

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/percona/everest/pkg/rbac"
)

// GetUserPermissions returns the permissions for the currently logged in user.
func (e *EverestServer) GetUserPermissions(c echo.Context) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		return errors.Join(errFailedToGetUser, err)
	}

	permissions, err := e.handler.GetUserPermissions(c.Request().Context(), user)
	if err != nil {
		e.l.Errorf("GetUserPermissions failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, permissions)
}
