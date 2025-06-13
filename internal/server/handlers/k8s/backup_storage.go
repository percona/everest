package k8s

import (
	"context"
	"errors"
	"fmt"

	"github.com/AlekSi/pointer"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *k8sHandler) ListBackupStorages(ctx context.Context, cluster, namespace string) (*everestv1alpha1.BackupStorageList, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}
	return connector.ListBackupStorages(ctx, ctrlclient.InNamespace(namespace))
}

func (h *k8sHandler) GetBackupStorage(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.BackupStorage, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}
	return connector.GetBackupStorage(ctx, types.NamespacedName{Namespace: namespace, Name: name})
}

func (h *k8sHandler) CreateBackupStorage(ctx context.Context, cluster, namespace string, req *api.CreateBackupStorageParams) (*everestv1alpha1.BackupStorage, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}
	bs, err := connector.GetBackupStorage(ctx, types.NamespacedName{Namespace: namespace, Name: req.Name})
	if err != nil && !k8serrors.IsNotFound(err) {
		return nil, fmt.Errorf("failed to get backup storage: %w", err)
	}
	if bs != nil && bs.GetName() != "" {
		return nil, k8serrors.NewAlreadyExists(schema.GroupResource{
			Group:    everestv1alpha1.GroupVersion.Group,
			Resource: "backupstorages",
		}, req.Name,
		)
	}

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: namespace,
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: backupSecretData(req.SecretKey, req.AccessKey),
	}
	_, err = connector.CreateSecret(ctx, secret)
	if k8serrors.IsAlreadyExists(err) {
		if _, err := connector.UpdateSecret(ctx, secret); err != nil {
			return nil, fmt.Errorf("failed to update secret: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to create secret: %w", err)
	}
	bs = &everestv1alpha1.BackupStorage{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: namespace,
		},
		Spec: everestv1alpha1.BackupStorageSpec{
			Type:                  everestv1alpha1.BackupStorageType(req.Type),
			Bucket:                req.BucketName,
			Region:                req.Region,
			CredentialsSecretName: req.Name,
			AllowedNamespaces:     pointer.Get(req.AllowedNamespaces),
			VerifyTLS:             req.VerifyTLS,
			ForcePathStyle:        req.ForcePathStyle,
		},
	}
	if req.Url != nil {
		bs.Spec.EndpointURL = *req.Url
	}
	if req.Description != nil {
		bs.Spec.Description = *req.Description
	}
	created, err := connector.CreateBackupStorage(ctx, bs)
	if err != nil {
		// TODO: Move this logic to the operator
		delObj := &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      req.Name,
				Namespace: namespace,
			},
		}
		dErr := connector.DeleteSecret(ctx, delObj)
		if dErr != nil {
			return nil, errors.Join(err, dErr)
		}
		return nil, fmt.Errorf("failed to create backup storage: %w", err)
	}

	return created, nil
}

func (h *k8sHandler) UpdateBackupStorage(ctx context.Context, cluster, namespace, name string, req *api.UpdateBackupStorageParams) (*everestv1alpha1.BackupStorage, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}
	if req.AccessKey != nil || req.SecretKey != nil {
		_, err := connector.UpdateSecret(ctx, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
			StringData: backupSecretData(pointer.GetString(req.SecretKey), pointer.GetString(req.AccessKey)),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update secret: %w", err)
		}
	}
	bs, err := connector.GetBackupStorage(ctx, types.NamespacedName{Namespace: namespace, Name: name})
	if err != nil {
		return nil, fmt.Errorf("failed to get backup storage: %w", err)
	}
	if req.BucketName != nil {
		bs.Spec.Bucket = *req.BucketName
	}
	if req.Region != nil {
		bs.Spec.Region = *req.Region
	}
	if req.Url != nil {
		bs.Spec.EndpointURL = *req.Url
	}
	if req.Description != nil {
		bs.Spec.Description = *req.Description
	}
	if req.AllowedNamespaces != nil {
		bs.Spec.AllowedNamespaces = *req.AllowedNamespaces //nolint:staticcheck
	}
	if req.VerifyTLS != nil {
		bs.Spec.VerifyTLS = req.VerifyTLS
	}
	if req.ForcePathStyle != nil {
		bs.Spec.ForcePathStyle = req.ForcePathStyle
	}
	return connector.UpdateBackupStorage(ctx, bs)
}

func (h *k8sHandler) DeleteBackupStorage(ctx context.Context, cluster, namespace, name string) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return fmt.Errorf("failed to get kubernetes connector: %w", err)
	}
	used, err := connector.IsBackupStorageUsed(ctx, types.NamespacedName{Namespace: namespace, Name: name})
	if err != nil {
		return fmt.Errorf("failed to check if backup storage='%s' in namespace='%s' is used: %w", name, namespace, err)
	}
	if used {
		return fmt.Errorf("backup storage='%s' in namespace='%s' is in use", name, namespace)
	}

	delBSObj := &everestv1alpha1.BackupStorage{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}
	if err := connector.DeleteBackupStorage(ctx, delBSObj); ctrlclient.IgnoreNotFound(err) != nil {
		return fmt.Errorf("failed to delete backup storage: %w", err)
	}

	delSecObj := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}
	if err := connector.DeleteSecret(ctx, delSecObj); ctrlclient.IgnoreNotFound(err) != nil {
		return fmt.Errorf("failed to delete secret: %w", err)
	}
	return nil
}

func backupSecretData(secretKey, accessKey string) map[string]string {
	return map[string]string{
		"AWS_SECRET_ACCESS_KEY": secretKey,
		"AWS_ACCESS_KEY_ID":     accessKey,
	}
}
