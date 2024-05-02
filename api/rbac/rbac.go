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

package rbac

import (
	"errors"
	"io/fs"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"k8s.io/apimachinery/pkg/types"

	configmapadapter "github.com/percona/everest/api/rbac/configmap-adapter"
	"github.com/percona/everest/data"
	"github.com/percona/everest/pkg/kubernetes"
)

// NewEnforcer creates a new Casbin enforcer with the RBAC model and ConfigMap adapter.
func NewEnforcer(kubeClient *kubernetes.Kubernetes) (*casbin.Enforcer, error) {
	modelData, err := fs.ReadFile(data.RBAC, "rbac/model.conf")
	if err != nil {
		return nil, errors.Join(err, errors.New("could not read casbin model"))
	}

	model, err := model.NewModelFromString(string(modelData))
	if err != nil {
		return nil, errors.Join(err, errors.New("could not create casbin model"))
	}

	// FIXME create const for "everest-rbac"
	adapter := configmapadapter.NewAdapter(kubeClient, types.NamespacedName{Namespace: kubeClient.Namespace(), Name: "everest-rbac"})

	return casbin.NewEnforcer(model, adapter, true)
}

// UserGetter is a function that extracts the user from the JWT token.
func UserGetter(c echo.Context) (string, error) {
	token, ok := c.Get("user").(*jwt.Token) // by default token is stored under `user` key
	if !ok {
		return "", errors.New("failed to get token from context")
	}

	claims, ok := token.Claims.(jwt.MapClaims) // by default claims is of type `jwt.MapClaims`
	if !ok {
		return "", errors.New("failed to get claims from token")
	}

	subject, err := claims.GetSubject()
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get subject from claims"))
	}

	return strings.Split(subject, ":")[0], nil
}
