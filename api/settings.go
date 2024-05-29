package api

import (
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
)

// GetSettings returns the Everest global settings.
func (e *EverestServer) GetSettings(ctx echo.Context) error {
	settings, err := e.kubeClient.GetEverestSettings(ctx.Request().Context())
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.To("Failed to get Everest settings"),
		})
	}
	config, err := settings.OIDCConfig()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.To("Failed to read Everest settings"),
		})
	}
	return ctx.JSON(http.StatusOK, &Settings{
		OidcConfig: OIDCConfig{
			ClientId:  config.ClientID,
			IssuerURL: config.IssuerURL,
		},
	})
}
