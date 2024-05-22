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
	"strings"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	"github.com/lestrrat-go/jwx/jwk"
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

// EverestServer represents the server struct.
type EverestServer struct {
	auth       authValidator
	config     *config.EverestConfig
	l          *zap.SugaredLogger
	echo       *echo.Echo
	kubeClient *kubernetes.Kubernetes
	sessionMgr *session.Manager
	jwkGetter  jwt.Keyfunc
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

	sessMgr := session.New(
		session.WithAccountManager(kubeClient.Accounts()),
		session.WithSigningKey([]byte(c.JWTSigningKey)),
	)

	jwkGetter, err := newJWKGetterOrIgnore(ctx)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create JWK getter"))
	}

	e := &EverestServer{
		config:     c,
		l:          l,
		echo:       echoServer,
		kubeClient: kubeClient,
		auth:       auth.NewToken(kubeClient, l, []byte(ns.UID)),
		sessionMgr: sessMgr,
		jwkGetter:  jwkGetter,
	}

	if err := e.initHTTPServer(); err != nil {
		return e, err
	}
	return e, err
}

func getOIDCIssuerURL() (string, error) {
	return "https://id-dev.percona.com/oauth2/default", nil //todo
}

// newJWKGetterOrIgnore returns a function for getting JWK public keys from an external IDP.
// If Everest is not configured to use an external IDP, it returns nil.
func newJWKGetterOrIgnore(ctx context.Context) (jwt.Keyfunc, error) {
	issuer, err := getOIDCIssuerURL()
	if err != nil {
		return nil, err
	}
	// Everest not configured to use OIDC, return early.
	if issuer == "" {
		return nil, nil //nolint:nilnil
	}

	oidcCfg, err := oidc.GetConfig(ctx, issuer)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get OIDC config"))
	}

	if oidcCfg.JWKSURL == "" {
		return nil, errors.New("did not find jwks_uri in oidc config")
	}

	refresher := jwk.NewAutoRefresh(ctx)
	refresher.Configure(oidcCfg.JWKSURL)

	return func(token *jwt.Token) (interface{}, error) {
		keySet, err := refresher.Fetch(ctx, oidcCfg.JWKSURL)
		if err != nil {
			return nil, err
		}

		keyID, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("expecting JWT header to have a key ID in the kid field")
		}

		key, found := keySet.LookupKeyID(keyID)
		if !found {
			return nil, fmt.Errorf("unable to find key %q", keyID)
		}

		var pubkey interface{}
		if err := key.Raw(&pubkey); err != nil {
			return nil, fmt.Errorf("Unable to get the public key. Error: %s", err.Error())
		}
		return pubkey, nil
	}, nil
}

// initHTTPServer configures http server for the current EverestServer instance.
func (e *EverestServer) initHTTPServer() error {
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
	apiGroup.Use(e.jwtMiddleWare())
	apiGroup.Use(e.checkOperatorUpgradeState)
	RegisterHandlers(apiGroup, e)

	return nil
}

func (e *EverestServer) jwtMiddleWare() echo.MiddlewareFunc {
	tokenLookup := "header:Authorization:Bearer "
	tokenLookup = tokenLookup + ",cookie:" + common.EverestTokenCookie
	return echojwt.WithConfig(echojwt.Config{
		Skipper: func(c echo.Context) bool {
			return strings.Contains(c.Request().URL.Path, "session")
		},
		SigningKey:  []byte(e.config.JWTSigningKey),
		TokenLookup: tokenLookup,
		KeyFunc:     e.jwkGetter,
	})
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
