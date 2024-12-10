package rbac

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
	if err := validateCreateMonitoringInstanceRequest(req); err != nil {
		return nil, errors.Join(errInvalidRequest, err)
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
	return h.next.UpdateMonitoringInstance(ctx, user, namespace, name, req)
}

func validateCreateMonitoringInstanceRequest(params *api.CreateMonitoringInstanceJSONRequestBody) error {
	if err := validateRFC1035(params.Name, "name"); err != nil {
		return err
	}

	if ok := validateURL(params.Url); !ok {
		return ErrInvalidURL("url")
	}

	switch params.Type {
	case api.MonitoringInstanceCreateParamsTypePmm:
		if params.Pmm == nil {
			return fmt.Errorf("pmm key is required for type %s", params.Type)
		}

		if params.Pmm.ApiKey == "" && (params.Pmm.User == "" || params.Pmm.Password == "") {
			return errors.New("pmm.apiKey or pmm.user with pmm.password fields are required")
		}
	default:
		return fmt.Errorf("monitoring type %s is not supported", params.Type)
	}

	return nil
}

func validateUpdateMonitoringInstanceRequest(params *api.UpdateMonitoringInstanceJSONRequestBody) error {

	if params.Url != "" {
		if ok := validateURL(params.Url); !ok {
			err := ErrInvalidURL("url")
			return err
		}
	}

	if err := validateUpdateMonitoringInstanceType(params); err != nil {
		return err
	}

	return nil
}

func validateUpdateMonitoringInstanceType(params *api.UpdateMonitoringInstanceJSONRequestBody) error {
	switch params.Type {
	case "":
		return nil
	case api.MonitoringInstanceUpdateParamsTypePmm:
		if params.Pmm == nil {
			return fmt.Errorf("pmm key is required for type %s", params.Type)
		}
	default:
		return errors.New("this monitoring type is not supported")
	}

	return nil
}
