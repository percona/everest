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

// Package client ...
package client

import (
	"context"
	"errors"
	"net/http"

	"github.com/percona/percona-everest-backend/client"
)

// Version retrieves Everest version informatoin.
func (e *Everest) Version(ctx context.Context) (*client.Version, error) {
	res := &client.Version{}
	err := makeRequest(
		ctx, func(
			ctx context.Context,
			_ struct{},
			r ...client.RequestEditorFn,
		) (*http.Response, error) {
			return e.cl.VersionInfo(ctx, r...)
		},
		struct{}{}, &res, errors.New("cannot get version due to Everest error"),
	)
	if err != nil {
		return nil, err
	}

	return res, nil
}
