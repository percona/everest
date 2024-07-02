package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"github.com/percona/everest/api/rbac"
	"go.uber.org/zap"
)

// GetUserPermissions ...
func (e *EverestServer) GetUserPermissions(c echo.Context) error {
	user, err := rbac.UserGetter(c)
	if err != nil {
		e.l.Error("Failed to get user from context: ", zap.Error(err))
		return err
	}
	permissions, err := e.rbacEnforcer.GetImplicitPermissionsForUser(user)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, &UserPermissions{
		Permissions: pointer.To(permissions),
	})
}
