package kubernetes

import (
	"context"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// K8sEnv represents type of Kubernetes environment.
type K8sEnv string

const (
	// EnvStandard is a standard k8s environment.
	EnvStandard K8sEnv = "Standard"
	// EnvOpenShift is an OpenShift k8s environment.
	EnvOpenShift K8sEnv = "OpenShift"

	// OpenShiftCatalogNamespace is a namespace where catalogs in an OpenShift cluster are stored.
	OpenShiftCatalogNamespace = "openshift-marketplace"
)

//nolint:gochecknoglobals
var (
	openShiftEnv = &Environment{
		Env:              EnvOpenShift,
		CatalogNamespace: OpenShiftCatalogNamespace,
		SkipOLM:          true,
	}
	standardEnv = &Environment{
		Env:              EnvStandard,
		CatalogNamespace: OLMNamespace,
		SkipOLM:          false,
	}
)

// Environment represents a Kubernetes environment.
type Environment struct {
	Env              K8sEnv
	CatalogNamespace string
	SkipOLM          bool
}

// DetectEnvironment detects Kubernetes environment.
func (k *Kubernetes) DetectEnvironment(ctx context.Context) (*Environment, error) {
	env, ok, err := k.detectOpenShift(ctx)
	if err != nil {
		return nil, err
	}
	if ok {
		return env, nil
	}
	return standardEnv, nil
}

func (k *Kubernetes) detectOpenShift(ctx context.Context) (*Environment, bool, error) {
	k.l.Debug("Detecting OpenShift")
	_, err := k.GetNamespace(ctx, OpenShiftCatalogNamespace)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			k.l.Info("Detected standard Kubernetes environment")
			return nil, false, nil
		}
		k.l.Info("Failed to detect Kubernetes environment")
		return nil, false, err
	}

	// If the OpenShift Marketplace namespace exists, we consider this an OpenShift cluster.
	k.l.Debug("Detected OpenShift Kubernetes environment")
	return openShiftEnv, true, nil
}
