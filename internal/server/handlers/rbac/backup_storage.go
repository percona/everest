package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *rbacHandler) ListBackupStorages(ctx context.Context, user, namespace string) (*everestv1alpha1.BackupStorageList, error) {
	return nil, nil
}

func (h *rbacHandler) GetBackupStorage(ctx context.Context, user, namespace, name string) (*everestv1alpha1.BackupStorage, error) {
	return nil, nil
}

func (h *rbacHandler) CreateBackupStorage(ctx context.Context, user string, req *everestv1alpha1.BackupStorage) error {
	return nil
}

func (h *rbacHandler) UpdateBackupStorage(ctx context.Context, user string, req *everestv1alpha1.BackupStorage) error {
	return nil
}

func (h *rbacHandler) DeleteBackupStorage(ctx context.Context, user, namespace, name string) error {
	return nil
}
