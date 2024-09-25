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

// Package main runs the helm tools command.
package main

import (
	"os"

	"github.com/go-logr/zapr"
	ctrlruntimelog "sigs.k8s.io/controller-runtime/pkg/log"

	commands "github.com/percona/everest/helm/cmd"
	"github.com/percona/everest/pkg/logger"
)

//go:generate go build -o ../bin/everest-helm-tools ./main.go

func main() {
	l := logger.MustInitLogger(false)

	// This is required because controller-runtime requires a logger
	// to be set within 30 seconds of the program initialization.
	log := zapr.NewLogger(l)
	ctrlruntimelog.SetLogger(log)

	rootCmd := commands.NewRootCmd(l.Sugar())
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
