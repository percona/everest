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

// Package client provides helpers to communicate with Everest API
package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/percona/percona-everest-backend/client"
)

const apiVersion = "v1"

// Everest is a connector to the Everest API.
type Everest struct {
	cl *client.Client
}

// ErrEverest is an error coming from Everest where Everest provided an error message.
var ErrEverest = errors.New("")

// NewEverest returns new Everest.
func NewEverest(everestClient *client.Client) *Everest {
	return &Everest{
		cl: everestClient,
	}
}

// NewEverestFromURL returns a new Everest from a provided URL.
func NewEverestFromURL(rawURL, everestPwd string) (*Everest, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not parse Everest URL"))
	}
	everestCl, err := client.NewClient(
		u.JoinPath(apiVersion).String(),
		client.WithRequestEditorFn(func(_ context.Context, req *http.Request) error {
			req.Header.Set("Cookie", fmt.Sprintf("everest_token=%s", everestPwd))
			return nil
		}),
	)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not initialize Everest client"))
	}
	return NewEverest(everestCl), nil
}

// makeRequest calls arbitrary *client.Client method for API call and applies common logic for response handling.
// See methods in Everest struct for examples how to call.
func makeRequest[B interface{}, R interface{}](
	ctx context.Context,
	fn func(context.Context, B, ...client.RequestEditorFn) (*http.Response, error),
	body B,
	ret R,
	errorStatus error,
) error {
	res, err := fn(ctx, body)
	if err != nil {
		return err
	}
	defer res.Body.Close() //nolint:errcheck

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return processErrorResponse(res, errorStatus)
	}
	err = json.NewDecoder(res.Body).Decode(ret)
	if errors.Is(err, io.EOF) {
		// In case the server returns no content, such as with the DELETE method,
		// don't return an error.
		return nil
	}

	return err
}

func processErrorResponse(res *http.Response, err error) error {
	errMsg := client.Error{}
	if err := json.NewDecoder(res.Body).Decode(&errMsg); err != nil {
		return errors.Join(err, fmt.Errorf("could not decode Everest error response (status %d)", res.StatusCode))
	}

	msg := fmt.Sprintf("unknown error (status %d)", res.StatusCode)
	if errMsg.Message != nil {
		msg = fmt.Sprintf("%s (status %d)", *errMsg.Message, res.StatusCode)
		return fmt.Errorf("%w%s: %w", ErrEverest, msg, err)
	}

	if err != nil {
		return errors.Join(err, errors.New(msg))
	}

	return errors.New("generic response error")
}
