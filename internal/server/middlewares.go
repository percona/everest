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

package server

import (
	"net/http"
	"slices"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"github.com/unrolled/secure"
	"github.com/unrolled/secure/cspbuilder"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/oidc"
)

const (
	CSPSelf           = "'self'"
	CSPNone           = "'none'"
	PermissionsPolicy = "accelerometer=(), autoplay=(), camera=(), cross-origin-isolated=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(self), usb=(), web-share=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(), gamepad=(), hid=(), idle-detection=(), interest-cohort=(), serial=(), unload=()"
)

func (e *EverestServer) shouldAllowRequestDuringEngineUpgrade(c echo.Context) (bool, error) {
	// We allow read-only requests.
	if c.Request().Method == http.MethodGet {
		return true, nil
	}

	// List of resources that should not be modified during an upgrade.
	targetResources := []string{
		"database-clusters",
		"database-engines",
		"database-cluster-restores",
		"database-cluster-backups",
	}

	// Check the request path for the target resources.
	resourceMatch := slices.ContainsFunc(targetResources, func(targetResource string) bool {
		return strings.Contains(c.Request().URL.Path, targetResource)
	})
	if !resourceMatch {
		return true, nil
	}

	namespace := c.Param("namespace")
	if namespace == "" {
		// We cannot infer the namespace, so we will allow.
		return true, nil
	}

	// Check if there's an engine in this namespace that is upgrading the operator?
	engines, err := e.kubeConnector.ListDatabaseEngines(c.Request().Context(), ctrlclient.InNamespace(namespace))
	if err != nil {
		e.l.Error(err)
		return false, err
	}
	locked := slices.ContainsFunc(engines.Items, func(engine everestv1alpha1.DatabaseEngine) bool {
		annotations := engine.GetAnnotations()
		_, found := annotations[everestv1alpha1.DatabaseOperatorUpgradeLockAnnotation]
		return found
	})
	return !locked, nil
}

// checkOperatorUpgradeState is a middleware that checks if the operator is upgrading,
// and denies requests accordingly.
func (e *EverestServer) checkOperatorUpgradeState(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if allow, err := e.shouldAllowRequestDuringEngineUpgrade(c); err != nil {
			e.l.Error(err)
			return err
		} else if !allow {
			return c.JSON(http.StatusPreconditionFailed, api.Error{
				Message: pointer.ToString("Cannot perform this operation while the operator is upgrading"),
			})
		}
		return next(c)
	}
}

func securityHeaders(oidcProvider *oidc.ProviderConfig) echo.MiddlewareFunc {
	connectSrc := []string{CSPSelf}
	if oidcProvider != nil {
		connectSrc = append(connectSrc, oidcProvider.Issuer+oidc.WellKnownPath)
		connectSrc = append(connectSrc, oidcProvider.TokenURL)
	}

	cspBuilder := cspbuilder.Builder{
		Directives: map[string][]string{
			cspbuilder.DefaultSrc: {CSPSelf},
			cspbuilder.FontSrc:    {CSPSelf, "data:"},
			cspbuilder.StyleSrc: {
				CSPSelf,
				// $NONCE will be replaced by the real nonce value
				// auto-generated by the secure middleware. This nonce will
				// be stored in the request's context and shall be embedded in
				// the index.html template.
				"$NONCE",
				// @emotion adds an extra inline style with the SHA256 hash of
				// an empty string, so we need to explicity allow it, see:
				// https://github.com/emotion-js/emotion/issues/2996
				"'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
			},
			cspbuilder.FormAction:     {CSPSelf},
			cspbuilder.BaseURI:        {CSPSelf},
			cspbuilder.ObjectSrc:      {CSPNone},
			cspbuilder.FrameAncestors: {CSPNone},
			// TODO (EVEREST-1180): Once we have native support for TLS, we
			// should probably redirect all HTTP traffic to HTTPS and set the
			// upgrade-insecure-requests directive.
			// cspbuilder.UpgradeInsecureRequests: {},
			cspbuilder.ConnectSrc: connectSrc,
		},
	}

	secureMiddleware := secure.New(secure.Options{
		ContentSecurityPolicy:     cspBuilder.MustBuild(),
		ContentTypeNosniff:        true,
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
		FrameDeny:                 true,
		PermissionsPolicy:         PermissionsPolicy,
		ReferrerPolicy:            "no-referrer",
		// TODO (EVEREST-1180): Once we have native support for TLS, we should
		// probably redirect all HTTP traffic to HTTPS.
		// SSLRedirect:                   true,
		// And we should set the HSTS header.
		// STSIncludeSubdomains:          true,
		// STSSeconds:                    31536000,
		XPermittedCrossDomainPolicies: "none",
	})

	return echo.WrapMiddleware(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store, max-age=0")
			w.Header().Set("Clear-Site-Data", "\"cache\",\"cookies\"")
			secureMiddleware.Handler(next).ServeHTTP(w, r)
		})
	})
}
