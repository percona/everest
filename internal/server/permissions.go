package server

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// GetUserPermissions returns the permissions for the currently logged in user.
func (e *EverestServer) GetUserPermissions(c echo.Context) error {
	permissions, err := e.handler.GetUserPermissions(c.Request().Context())
	if err != nil {
		e.l.Errorf("GetUserPermissions failed: %w", err)
		return err
	}
	return c.JSON(http.StatusOK, permissions)
}
