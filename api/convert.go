package api

import (
	"encoding/json"
)

// IntoCR is a generic function that converts an API object into its corresponding Custom Resource object.
func IntoCR[T any](in any) (*T, error) {
	b, err := json.Marshal(in)
	if err != nil {
		return nil, err
	}

	out := new(T)
	if err := json.Unmarshal(b, out); err != nil {
		return nil, err
	}
	return out, nil
}
