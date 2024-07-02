package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/percona/everest/api/rbac"
)

// GetUserPermissions returns the permissions for the currently logged in user.
func (e *EverestServer) GetUserPermissions(c echo.Context) error {
	user, err := rbac.GetUser(c)
	if err != nil {
		e.l.Error("Failed to get user from context: ", zap.Error(err))
		return err
	}

	permissions, err := e.rbacEnforcer.GetImplicitPermissionsForUser(user)
	if err != nil {
		e.l.Error("Failed to get implicit permissions: ", zap.Error(err))
		return err
	}

	return c.JSON(http.StatusOK, &UserPermissions{
		Permissions: pointer.To(permissions),
	})
}
