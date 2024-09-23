package main

import (
	"context"
	"flag"
	"time"

	"github.com/go-logr/zapr"
	"go.uber.org/zap"
	ctrlruntimelog "sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/kubernetes/helm"
	"github.com/percona/everest/pkg/logger"
)

var kubeconfigPath string

func init() {
	flag.StringVar(&kubeconfigPath, "kubeconfig", "", "Path to kubeconfig file")
	flag.Parse()
}

func main() {
	logger := logger.MustInitLogger(false)
	defer logger.Sync()
	// This is required because controller-runtime requires a logger
	// to be set within 30 seconds of the program initialization.
	ctrlruntimelog.SetLogger(zapr.NewLogger(logger))

	l := logger.Sugar()
	kubeClient, err := newClient(l)
	if err != nil {
		l.Fatal(err)
	}
	helmInstaller := helm.New(l, kubeClient)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := helmInstaller.ApproveEverestMonitoringInstallPlan(ctx); err != nil {
		l.Fatalf("Failed to approve the install plan for Everest monitoring: %v", err)
	}
	l.Info("Installed Everest monitoring successfully")

	if err := helmInstaller.ApproveEverestOperatorInstallPlan(ctx); err != nil {
		l.Fatalf("Failed to approve the install plan Everest operator: %v", err)
	}
	l.Info("Installed Everest operator successfully")

	if err := helmInstaller.ApproveDBNamespacesInstallPlans(ctx); err != nil {
		l.Fatalf("Failed to approve the install plan(s) for DB namespaces: %v", err)
	}
	l.Info("Installed Everest DB namespaces successfully")
}

func newClient(l *zap.SugaredLogger) (kubernetes.KubernetesConnector, error) {
	if kubeconfigPath != "" {
		return kubernetes.New(kubeconfigPath, l)
	}
	return kubernetes.NewInCluster(l)
}
