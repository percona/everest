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

var (
	kubeconfigPath string
	deleteDBs      bool
)

func init() {
	flag.StringVar(&kubeconfigPath, "kubeconfig", "", "Path to kubeconfig file")
	flag.BoolVar(&deleteDBs, "delete-dbs", false, "If set, force deletes all existing DBs in the cluster")
	flag.Parse()
}

func main() {
	logger := logger.MustInitLogger(false)
	defer logger.Sync()
	// This is required because controller-runtime requires a logger
	// to be set within 30 seconds of the program initialization.
	ctrlruntimelog.SetLogger(zapr.NewLogger(logger))

	l := logger.Sugar()
	kubeClient, err := helmutils.NewClient(l, kubeconfigPath)
	if err != nil {
		l.Fatal(err)
	}
	helmInstaller := helm.New(l, kubeClient)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
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
