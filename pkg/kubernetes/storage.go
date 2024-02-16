package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
)

// GetPersistentVolumes returns list of persistent volumes.
func (k *Kubernetes) GetPersistentVolumes(ctx context.Context) (*corev1.PersistentVolumeList, error) {
	return k.client.GetPersistentVolumes(ctx)
}

// GetStorageClasses returns list of storage classes.
func (k *Kubernetes) GetStorageClasses(ctx context.Context) (*storagev1.StorageClassList, error) {
	return k.client.GetStorageClasses(ctx)
}
