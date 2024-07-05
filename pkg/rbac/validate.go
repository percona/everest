package rbac

import (
	"context"
	"fmt"

	"github.com/casbin/casbin/v2"
	"github.com/percona/everest/pkg/kubernetes"
	"go.uber.org/zap"
)

type ValidationArgs struct {
	Filepath   string
	KubeClient *kubernetes.Kubernetes
}

// ValidatePolicy validates a policy from either Kubernetes or local file.
func ValidatePolicy(ctx context.Context, k *kubernetes.Kubernetes, filepath string) error {
	_, err := newKubeOrFileEnforcer(ctx, k, filepath)
	if err != nil {
		return fmt.Errorf("policy syntax error")
	}
	return nil
}

func newKubeOrFileEnforcer(
	ctx context.Context,
	kubeClient *kubernetes.Kubernetes,
	filePath string,
) (e *casbin.Enforcer, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
			e = nil
		}
	}()
	if filePath != "" {
		return NewEnforcerFromFilePath(ctx, filePath)
	}
	return NewEnforcer(ctx, kubeClient, zap.NewNop().Sugar())

}
