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
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	middleware "github.com/oapi-codegen/echo-middleware"
	"go.uber.org/zap"
	"golang.org/x/time/rate"

	"github.com/percona/everest/cmd/config"
	"github.com/percona/everest/pkg/auth"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/oidc"
	"github.com/percona/everest/pkg/session"
	"github.com/percona/everest/public"
)

const (
	oidcIssuer = "https://id-dev.percona.com/oauth2/default"
)

// EverestServer represents the server struct.
type EverestServer struct {
	auth       authValidator
	config     *config.EverestConfig
	l          *zap.SugaredLogger
	echo       *echo.Echo
	kubeClient *kubernetes.Kubernetes
	sessionMgr *session.Manager
}

type authValidator interface {
	Valid(ctx context.Context, token string) (bool, error)
}

// NewEverestServer creates and configures everest API.
func NewEverestServer(ctx context.Context, c *config.EverestConfig, l *zap.SugaredLogger) (*EverestServer, error) {
	kubeClient, err := kubernetes.NewInCluster(l)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed creating Kubernetes client"))
	}

	ns, err := kubeClient.GetNamespace(ctx, kubeClient.Namespace())
	if err != nil {
		l.Error(err)
		return nil, errors.New("could not get namespace from Kubernetes")
	}

	echoServer := echo.New()
	echoServer.Use(echomiddleware.RateLimiter(echomiddleware.NewRateLimiterMemoryStore(rate.Limit(c.APIRequestsRateLimit))))

	// Get the signing key required for managing Everest users.
	jwtSigningKey, err := getJWTSigningKey()
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get JWT signing key"))
	}

	sessMgr := session.New(
		session.WithAccountManager(kubeClient.Accounts()),
		session.WithSigningKey(jwtSigningKey),
	)

	e := &EverestServer{
		config:     c,
		l:          l,
		echo:       echoServer,
		kubeClient: kubeClient,
		auth:       auth.NewToken(kubeClient, l, []byte(ns.UID)),
		sessionMgr: sessMgr,
	}

	if err := e.initHTTPServer(ctx); err != nil {
		return e, err
	}
	return e, err
}

func getJWTSigningKey() (*rsa.PrivateKey, error) {
	pemString, err := os.ReadFile(common.EverestJWTPrivateKeyFile)
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot read private key file"))
	}
	block, _ := pem.Decode(pemString)
	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, errors.Join(err, errors.New("cannot parse private key"))
	}
	return key, nil
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

func newJWTKeyFunc(ctx context.Context) (jwt.Keyfunc, error) {
	everestKeyFunc := session.NewKeyFunc()
	oidcKeyFunc, err := oidc.NewKeyFunc(ctx, oidcIssuer)
	if err != nil {
		return nil, err
	}
	return func(token *jwt.Token) (interface{}, error) {
		if token.Header["kid"] == session.KeyID {
			return everestKeyFunc(token)
		}
		return oidcKeyFunc(token)
	}, nil
}

func (e *EverestServer) jwtMiddleWare(ctx context.Context) (echo.MiddlewareFunc, error) {
	keyFunc, err := newJWTKeyFunc(ctx)
	if err != nil {
		return nil, err
	}
	tokenLookup := "header:Authorization:Bearer "
	tokenLookup = tokenLookup + ",cookie:" + common.EverestTokenCookie
	return echojwt.WithConfig(echojwt.Config{
		Skipper: func(c echo.Context) bool {
			return strings.Contains(c.Request().URL.Path, "session")
		},
		TokenLookup: tokenLookup,
		KeyFunc:     keyFunc,
	}), nil
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
