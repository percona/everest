package validation

import (
	"context"
	"errors"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListMonitoringInstances(ctx context.Context, user, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return h.next.ListMonitoringInstances(ctx, user, namespace)
}

func (h *validateHandler) CreateMonitoringInstance(ctx context.Context, user, namespace string, req *api.CreateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	if err := validateRFC1035(req.Name, "name"); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	if ok := validateURL(req.Url); !ok {
		return nil, errors.Join(ErrInvalidRequest, ErrInvalidURL("url"))
	}
	switch req.Type {
	case api.MonitoringInstanceCreateParamsTypePmm:
		if req.Pmm == nil {
			return nil, fmt.Errorf("pmm key is required for type %s", req.Type)
		}

		if req.Pmm.ApiKey == "" && (req.Pmm.User == "" || req.Pmm.Password == "") {
			return nil, errors.New("pmm.apiKey or pmm.user with pmm.password fields are required")
		}
	default:
		return nil, fmt.Errorf("monitoring type %s is not supported", req.Type)
	}
	return h.next.CreateMonitoringInstance(ctx, user, namespace, req)
}

func (h *validateHandler) DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error {
	return h.next.DeleteMonitoringInstance(ctx, user, namespace, name)
}

func (h *validateHandler) GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return h.next.GetMonitoringInstance(ctx, user, namespace, name)
}

func (h *validateHandler) UpdateMonitoringInstance(ctx context.Context, user, namespace, name string, req *api.UpdateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	if req.Url != "" {
		if ok := validateURL(req.Url); !ok {
			err := ErrInvalidURL("url")
			return nil, err
		}
	}

	switch req.Type {
	case "": // nothing to do.
	case api.MonitoringInstanceUpdateParamsTypePmm:
		if req.Pmm == nil {
			return nil, fmt.Errorf("pmm key is required for type %s", req.Type)
		}
	default:
		return nil, errors.New("this monitoring type is not supported")
	}
	return h.next.UpdateMonitoringInstance(ctx, user, namespace, name, req)
}
