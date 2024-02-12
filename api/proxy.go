// percona-everest-backend
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

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
)

var (
	//nolint:gochecknoglobals
	everestCRDErrorMessageMap = map[string]string{
		"databaseclusters.everest.percona.com":        "Database cluster",
		"databaseengines.everest.percona.com":         "Database engine",
		"backupstorages.everest.percona.com":          "Backup storage",
		"databaseclusterrestores.everest.percona.com": "Restore",
		"databaseclusterbackups.everest.percona.com":  "Backup",
	}
	//nolint:gochecknoglobals
	rewriteCodes = map[int]bool{
		http.StatusBadRequest:          true,
		http.StatusNotFound:            true,
		http.StatusUnprocessableEntity: true,
		http.StatusConflict:            true,
	}
)

func (e *EverestServer) proxyKubernetes(ctx echo.Context, namespace, kind, name string) error {
	config := e.kubeClient.Config()
	reverseProxy := httputil.NewSingleHostReverseProxy(
		&url.URL{
			Host:   strings.TrimPrefix(config.Host, "https://"),
			Scheme: "https",
		})
	transport, err := rest.TransportFor(config)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString("Could not create REST transport"),
		})
	}
	reverseProxy.Transport = transport
	reverseProxy.ErrorHandler = everestErrorHandler(e.l)
	reverseProxy.ModifyResponse = everestResponseModifier(e.l) //nolint:bodyclose
	req := ctx.Request()
	// All requests to Everest are protected by authorization.
	// We need to remove the header, otherwise Kubernetes returns 401 unauthorized response.
	req.Header.Del("Authorization")
	if namespace == "" {
		namespace = e.kubeClient.Namespace()
	}
	req.URL.Path = buildProxiedURL(namespace, kind, name)
	reverseProxy.ServeHTTP(ctx.Response(), req)
	return nil
}

func buildProxiedURL(namespace, kind, name string) string {
	proxiedURL := fmt.Sprintf(
		"/apis/everest.percona.com/v1alpha1/namespaces/%s/%s",
		url.PathEscape(strings.ReplaceAll(namespace, "/", "")),
		url.PathEscape(strings.ReplaceAll(kind, "/", "")),
	)
	if name != "" {
		proxiedURL += fmt.Sprintf("/%s", url.PathEscape(strings.ReplaceAll(name, "/", "")))
	}
	return proxiedURL
}

func everestResponseModifier(logger *zap.SugaredLogger) func(resp *http.Response) error {
	return func(resp *http.Response) error {
		if _, ok := rewriteCodes[resp.StatusCode]; ok {
			b, err := io.ReadAll(resp.Body)
			if err != nil {
				logger.Error(errors.Join(err, errors.New("failed reading body")))
				return err
			}
			err = resp.Body.Close()
			if err != nil {
				logger.Error(errors.Join(err, errors.New("failed closing body")))
				return err
			}
			b, err = tryOverrideResponseBody(b)
			if err != nil {
				logger.Error(errors.Join(err, errors.New("failed overriding response body")))
				return err
			}

			body := io.NopCloser(bytes.NewReader(b))
			resp.Body = body
			resp.ContentLength = int64(len(b))
			resp.Header.Set("Content-Length", strconv.Itoa(len(b)))
		}
		return nil
	}
}

func tryOverrideResponseBody(b []byte) ([]byte, error) {
	status := metav1.Status{}
	err := json.Unmarshal(b, &status)
	if err != nil {
		return b, err
	}
	parts := strings.Split(status.Message, " ")
	if len(parts) == 0 {
		// Do not override it and return the original response
		return b, nil
	}
	var ok bool
	parts[0], ok = everestCRDErrorMessageMap[parts[0]]
	if !ok {
		// Do not override it and return the original response
		return b, nil
	}
	status.Message = strings.Join(parts, " ")
	b, err = json.Marshal(status)
	return b, err
}

func everestErrorHandler(logger *zap.SugaredLogger) func(http.ResponseWriter, *http.Request, error) {
	b, err := json.Marshal(Error{Message: pointer.ToString("Kubernetes cluster is unavailable")})
	if err != nil {
		logger.Error(err.Error())
	}
	return func(res http.ResponseWriter, req *http.Request, err error) {
		res.WriteHeader(http.StatusInternalServerError)
		if _, err := res.Write(b); err != nil {
			logger.Error(err.Error())
		}
	}
}
