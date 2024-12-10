package server

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/rbac"
)

// GetUserPermissions returns the permissions for the currently logged in user.
func (e *EverestServer) GetUserPermissions(c echo.Context) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		e.l.Error("Failed to get user from context: ", zap.Error(err))
		return err
	}

	permissions, err := e.handler.GetUserPermissions(c.Request().Context(), user)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, permissions)
}
