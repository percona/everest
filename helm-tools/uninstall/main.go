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

// Package main ...
package main

import (
	"context"
	"flag"
	"time"

	"github.com/go-logr/zapr"
	ctrlruntimelog "sigs.k8s.io/controller-runtime/pkg/log"

	helmutils "github.com/percona/everest/helm-tools/utils"
	"github.com/percona/everest/pkg/kubernetes/helm"
	"github.com/percona/everest/pkg/logger"
)

//nolint:gochecknoglobals
var (
	kubeconfigPath string
	deleteDBs      bool
)

func initFlags() {
	flag.StringVar(&kubeconfigPath, "kubeconfig", "", "Path to kubeconfig file")
	flag.BoolVar(&deleteDBs, "delete-dbs", false, "If set, force deletes all existing DBs in the cluster")
	flag.Parse()
}

func main() {
	initFlags()
	logger := logger.MustInitLogger(false)
	defer logger.Sync() //nolint:errcheck
	// This is required because controller-runtime requires a logger
	// to be set within 30 seconds of the program initialization.
	ctrlruntimelog.SetLogger(zapr.NewLogger(logger))

	l := logger.Sugar()
	kubeClient, err := helmutils.NewClient(l, kubeconfigPath)
	if err != nil {
		l.Fatal(err)
	}
	helmInstaller := helm.New(l, kubeClient)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute) //nolint:mnd
	defer cancel()

	if deleteDBs {
		l.Info("Deleting all existing DBs in the cluster")
		if err := helmInstaller.DeleteAllDatabaseClusters(ctx); err != nil {
			l.Fatalf("Failed to delete all existing DBs: %v", err)
		}
	}

	// Before the OLM namespace is terminated by helm uninstall, we must first
	// delete the PackageServer CSV so that OLM is uninstalled gracefully, and does not get stuck.
	if err := helmInstaller.DeleteOLM(ctx); err != nil {
		l.Fatalf("Failed to delete OLM: %v", err)
	}
}
