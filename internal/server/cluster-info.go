package server

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// GetKubernetesClusterInfo returns the cluster type and storage classes of a kubernetes cluster.
func (e *EverestServer) GetKubernetesClusterInfo(ctx echo.Context, cluster string) error {
	result, err := e.handler.GetKubernetesClusterInfo(ctx.Request().Context(), cluster)
	if err != nil {
		e.l.Errorf("GetKubernetesClusterInfo failed: %w", err)
		return err
	}
	return ctx.JSON(http.StatusOK, result)
}
