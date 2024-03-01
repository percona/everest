// Package scripts provides embed scripts.
package scripts

import "embed"

//go:embed deploy/*
var deployScripts embed.FS

// Manifest returns Everest manifest file content.
func Manifest() ([]byte, error) {
	data, err := deployScripts.ReadFile("deploy/quickstart-k8s.yaml")
	if err != nil {
		return nil, err
	}

	return data, nil
}
