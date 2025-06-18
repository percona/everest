// Package validation provides the validation handler.
package validation

import (
	"go.uber.org/zap"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

type validateHandler struct {
	log           *zap.SugaredLogger
	next          handlers.Handler
	kubeConnector kubernetes.KubernetesConnector
}

// New returns a new RBAC handler.
//
//nolint:ireturn
func New(
	log *zap.SugaredLogger,
	kubeConnector kubernetes.KubernetesConnector,
) handlers.Handler {
	l := log.With("handler", "validator")
	return &validateHandler{
		log:           l,
		kubeConnector: kubeConnector,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *validateHandler) SetNext(next handlers.Handler) {
	h.next = next
}

// Checks whether the Everest object is in use.
// Returns true in case "everest.percona.com/readonly-protection" finalizer is present.
func (h *validateHandler) isEverestReadOnlyObject(obj client.Object) bool {
	return controllerutil.ContainsFinalizer(obj, everestv1alpha1.ReadOnlyFinalizer)
}

// Checks whether the Everest object is in use.
// Returns true in case "everest.percona.com/in-use-protection" finalizer is present.
func (h *validateHandler) isEverestObjectInUse(obj client.Object) bool {
	return controllerutil.ContainsFinalizer(obj, everestv1alpha1.InUseResourceFinalizer)
}
