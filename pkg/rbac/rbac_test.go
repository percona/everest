package rbac

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestGetScopeValues(t *testing.T) {
	t.Parallel()
	testcases := []struct {
		desc   string
		claims jwt.MapClaims
		scopes []string
		out    []string
	}{
		{
			desc:   "empty claims",
			claims: jwt.MapClaims{},
			scopes: []string{"groups"},
			out:    []string{},
		},
		{
			desc:   "empty scopes",
			claims: jwt.MapClaims{"groups": []string{"my-org:my-team"}},
			scopes: nil,
			out:    []string{},
		},
		{
			desc:   "empty groups",
			claims: jwt.MapClaims{"groups": []string{}},
			scopes: []string{"groups"},
			out:    []string{},
		},
		{
			desc:   "single group",
			claims: jwt.MapClaims{"groups": []string{"my-org:my-team"}},
			scopes: []string{"groups"},
			out:    []string{"my-org:my-team"},
		},
		{
			desc:   "multiple groups",
			claims: jwt.MapClaims{"groups": []string{"my-org:my-team1", "my-org:my-team2"}},
			scopes: []string{"groups"},
			out:    []string{"my-org:my-team1", "my-org:my-team2"},
		},
		{
			desc:   "multiple groups and other",
			claims: jwt.MapClaims{"groups": []string{"my-org:my-team1", "my-org:my-team2"}, "other": []string{"other1", "other2"}},
			scopes: []string{"groups"},
			out:    []string{"my-org:my-team1", "my-org:my-team2"},
		},
		{
			desc:   "multiple groups and other with all scopes",
			claims: jwt.MapClaims{"groups": []string{"my-org:my-team1", "my-org:my-team2"}, "other": []string{"other1", "other2"}},
			scopes: []string{"groups", "other"},
			out:    []string{"my-org:my-team1", "my-org:my-team2", "other1", "other2"},
		},
	}

	for _, tc := range testcases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.out, getScopeValues(tc.claims, tc.scopes))
		})
	}
}
