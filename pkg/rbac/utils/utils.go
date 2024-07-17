// Package utils contains utility functions for RBAC.
package utils

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/casbin/casbin/v2/model"
	"github.com/casbin/casbin/v2/persist"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/percona/everest/pkg/session"
)

const (
	numFieldsPolicyLine = 2
)

// LoadPolicyLine loads a text line as a policy rule to model.
//
// This function is copied (and modified) from https://github.com/casbin/casbin/blob/71c8c84e300cf8b276f28e21e555a39ad793d65c/persist/adapter.go#L25.
// The original function is missing certain validations that leads to panics.
func LoadPolicyLine(line string, m model.Model) error {
	if line == "" || strings.HasPrefix(line, "#") {
		return nil
	}

	r := csv.NewReader(strings.NewReader(line))
	r.Comma = ','
	r.Comment = '#'
	r.TrimLeadingSpace = true

	tokens, err := r.Read()
	if err != nil {
		return err
	}

	if len(tokens) < numFieldsPolicyLine {
		return fmt.Errorf("invalid policy line '%s'", line)
	}
	if tokens[0] != "p" && tokens[0] != "g" {
		return fmt.Errorf("invalid policy line '%s'", line)
	}

	return persist.LoadPolicyArray(tokens, m)
}

// GetUser extracts the user from the JWT token in the context.
func GetUser(c echo.Context) (string, error) {
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

	issuer, err := claims.GetIssuer()
	if err != nil {
		return "", errors.Join(err, errors.New("failed to get issuer from claims"))
	}

	if issuer == session.SessionManagerClaimsIssuer {
		return strings.Split(subject, ":")[0], nil
	}
	return subject, nil
}

func ErrorHandler(c echo.Context, internal error, proposedStatus int) error {
	if proposedStatus == http.StatusForbidden {
		internal = errors.New("unauthorized access")
		if strings.Contains(c.Request().URL.Path, "backup-storages") ||
			strings.Contains(c.Request().URL.Path, "monitoring-instances") {
			internal = errors.New(
				"unauthorized: object is used in a namespace that a user does not have access to",
			)
		}
	}
	err := echo.NewHTTPError(proposedStatus, internal.Error())
	err.Internal = internal
	return err
}
