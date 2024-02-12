package api

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/percona/percona-everest-backend/pkg/version"
)

// VersionInfo returns the current version information.
func (e *EverestServer) VersionInfo(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, &Version{
		ProjectName: version.ProjectName,
		Version:     version.Version,
		FullCommit:  version.FullCommit,
	})
}
