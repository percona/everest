// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package api contains the API server implementation.
package api

//go:generate ../bin/oapi-codegen --config=server.cfg.yml  ../docs/spec/openapi.yml

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"slices"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	middleware "github.com/oapi-codegen/echo-middleware"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/cmd/config"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/oidc"
	"github.com/percona/everest/pkg/session"
	"github.com/percona/everest/public"
)

// EverestServer represents the server struct.
type EverestServer struct {
	config     *config.EverestConfig
	l          *zap.SugaredLogger
	echo       *echo.Echo
	kubeClient *kubernetes.Kubernetes
	sessionMgr *session.Manager
}

// NewEverestServer creates and configures everest API.
func NewEverestServer(ctx context.Context, c *config.EverestConfig, l *zap.SugaredLogger) (*EverestServer, error) {
	kubeClient, err := kubernetes.NewInCluster(l)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed creating Kubernetes client"))
	}

	echoServer := echo.New()
	echoServer.Use(echomiddleware.RateLimiter(echomiddleware.NewRateLimiterMemoryStore(rate.Limit(c.APIRequestsRateLimit))))

	sessMgr, err := session.New(
		session.WithAccountManager(kubeClient.Accounts()),
	)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to create session manager"))
	}

	e := &EverestServer{
		config:     c,
		l:          l,
		echo:       echoServer,
		kubeClient: kubeClient,
		sessionMgr: sessMgr,
	}

	if err := e.initHTTPServer(ctx); err != nil {
		return e, err
	}
	return e, err
}

// initHTTPServer configures http server for the current EverestServer instance.
func (e *EverestServer) initHTTPServer(ctx context.Context) error {
	swagger, err := GetSwagger()
	if err != nil {
		return err
	}
	fsys, err := fs.Sub(public.Static, "dist")
	if err != nil {
		return errors.Join(err, errors.New("error reading filesystem"))
	}
	staticFilesHandler := http.FileServer(http.FS(fsys))
	indexFS := echo.MustSubFS(public.Index, "dist")
	// FIXME: Ideally it should be redirected to /everest/ and FE app should be served using this endpoint.
	//
	// We tried to do this with Fabio and FE app requires the following changes to be implemented:
	// 1. Add basePath configuration for react router
	// 2. Add apiUrl configuration for FE app
	//
	// Once it'll be implemented we can serve FE app on /everest/ location
	e.echo.FileFS("/*", "index.html", indexFS)
	e.echo.GET("/favicon.ico", echo.WrapHandler(staticFilesHandler))
	e.echo.GET("/assets-manifest.json", echo.WrapHandler(staticFilesHandler))
	e.echo.GET("/static/*", echo.WrapHandler(staticFilesHandler))
	e.echo.Use(echomiddleware.LoggerWithConfig(echomiddleware.LoggerConfig{
		Format:           echomiddleware.DefaultLoggerConfig.Format,
		CustomTimeFormat: echomiddleware.DefaultLoggerConfig.CustomTimeFormat,
		Skipper: func(c echo.Context) bool {
			return c.Request().RequestURI == "/healthz"
		},
	}))
	e.echo.Pre(echomiddleware.RemoveTrailingSlash())

	basePath, err := swagger.Servers.BasePath()
	if err != nil {
		return errors.Join(err, errors.New("could not get base path"))
	}

	// Use our validation middleware to check all requests against the OpenAPI schema.
	apiGroup := e.echo.Group(basePath)
	apiGroup.Use(middleware.OapiRequestValidatorWithOptions(swagger, &middleware.Options{
		SilenceServersWarning: true,
		// This field is required if a security scheme is specified.
		// However, the actual authentication is handled by the JWT middleware, so we can use a noop function here.
		Options: openapi3filter.Options{
			AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
		},
	}))

	jwtMW, err := e.jwtMiddleWare(ctx)
	if err != nil {
		return err
	}
	apiGroup.Use(jwtMW)

	apiGroup.Use(e.checkOperatorUpgradeState)
	RegisterHandlers(apiGroup, e)

	return nil
}

func (e *EverestServer) oidcKeyFn(ctx context.Context) (jwt.Keyfunc, error) {
	settings, err := e.kubeClient.GetEverestSettings(ctx)
	if err = client.IgnoreNotFound(err); err != nil {
		return nil, err
	}
	if settings.OIDCConfigRaw == "" {
		return nil, nil
	}
	oidcConfig, err := settings.OIDCConfig()
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot parse OIDC raw config"))
	}
	return oidc.NewKeyFunc(ctx, oidcConfig.IssuerURL)
}

func (e *EverestServer) newJWTKeyFunc(ctx context.Context) (jwt.Keyfunc, error) {
	oidcKeyFn, err := e.oidcKeyFn(ctx)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get OIDC key function"))
	}

	return func(token *jwt.Token) (interface{}, error) {
		if token.Header["kid"] == session.KeyID {
			return e.sessionMgr.KeyFunc()(token)
		}
		// XXX: currently we use OIDC only, but once we have multiple protocols supported,
		// we should have a way to select which KeyFunc to use.
		if oidcKeyFn != nil {
			return oidcKeyFn(token)
		}
		return nil, errors.New("no key found for token")
	}, nil
}

func (e *EverestServer) jwtMiddleWare(ctx context.Context) (echo.MiddlewareFunc, error) {
	keyFunc, err := e.newJWTKeyFunc(ctx)
	if err != nil {
		return nil, err
	}

	skipper, err := newSkipperFunc()
	if err != nil {
		return nil, err
	}

	tokenLookup := "header:Authorization:Bearer "
	tokenLookup = tokenLookup + ",cookie:" + common.EverestTokenCookie
	return echojwt.WithConfig(echojwt.Config{
		Skipper:     skipper,
		TokenLookup: tokenLookup,
		KeyFunc:     keyFunc,
	}), nil
}

func newSkipperFunc() (echomiddleware.Skipper, error) {
	swagger, err := GetSwagger()
	if err != nil {
		return nil, err
	}

	// list of API paths to exclude from security checks.
	// Each item is a string in the format of "<method> <path>"
	// For example: ["GET /v1/settings"]
	excluded := []string{}

	for path, pathItem := range swagger.Paths.Map() {
		for method, operation := range pathItem.Operations() {
			// Check if we have explicitly specified that we don't want any security here?
			if operation.Security != nil && len(*operation.Security) == 0 {
				for _, srv := range swagger.Servers {
					excluded = append(excluded, fmt.Sprintf("%s %s", method, srv.URL+path))
				}
			}
		}
	}

	return func(c echo.Context) bool {
		target := c.Request().Method + " " + c.Path()
		return slices.Contains(excluded, target)
	}, nil
}

// Start starts everest server.
func (e *EverestServer) Start() error {
	return e.echo.Start(fmt.Sprintf("0.0.0.0:%d", e.config.HTTPPort))
}

// Shutdown gracefully stops the Everest server.
func (e *EverestServer) Shutdown(ctx context.Context) error {
	e.l.Info("Shutting down http server")
	if err := e.echo.Shutdown(ctx); err != nil {
		e.l.Error(errors.Join(err, errors.New("could not shut down http server")))
		return err
	}
	e.l.Info("http server shut down")

	return nil
}

func (e *EverestServer) getBodyFromContext(ctx echo.Context, into any) error {
	// GetBody creates a copy of the body to avoid "spoiling" the request before proxing
	reader, err := ctx.Request().GetBody()
	if err != nil {
		return err
	}

	decoder := json.NewDecoder(reader)
	if err := decoder.Decode(into); err != nil {
		return errors.Join(err, errors.New("could not decode body"))
	}
	return nil
}
