package k8s

import (
	"context"
	"errors"
	"fmt"
	"reflect"

	"github.com/AlekSi/pointer"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/kubernetes"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
)

const (
	annotationStorageClassDefault = "storageclass.kubernetes.io/is-default-class"
)

func (h *k8sHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	// Get cluster type
	clusterType, err := h.kubeClient.GetClusterType(ctx)
	if err != nil {
		// Instead of failing we switch to a generic cluster type.
		clusterType = kubernetes.ClusterTypeGeneric
	}

	var volumes *corev1.PersistentVolumeList
	if clusterType == kubernetes.ClusterTypeEKS {
		volumes, err = h.kubeClient.GetPersistentVolumes(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to GetPersistentVolumes: %w", err)
		}
	}

	res, err := h.calculateClusterResources(ctx, h.kubeClient, clusterType, volumes)
	if err != nil {
		return nil, fmt.Errorf("failed to calculateClusterResources: %w", err)
	}
	return res, nil
}

func (h *k8sHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	clusterType, err := h.kubeClient.GetClusterType(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to GetClusterType: %w", err)
	}
	storagesList, err := h.kubeClient.GetStorageClasses(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to GetStorageClasses: %w", err)
	}
	classNames := storageClasses(storagesList)
	return &api.KubernetesClusterInfo{ClusterType: string(clusterType), StorageClassNames: classNames}, nil
}

func (k *k8sHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	// not handled by k8s
	return nil, nil
}

func storageClasses(storagesList *storagev1.StorageClassList) []string {
	classNames := make([]string, len(storagesList.Items))
	swap := reflect.Swapper(classNames)
	for i, storageClass := range storagesList.Items {
		classNames[i] = storageClass.Name
		if _, ok := storageClass.Annotations[annotationStorageClassDefault]; ok {
			if i != 0 {
				swap(i, 0)
			}
		}
	}
	return classNames
}

func (h *k8sHandler) calculateClusterResources(
	ctx context.Context, kubeClient *kubernetes.Kubernetes, clusterType kubernetes.ClusterType,
	volumes *corev1.PersistentVolumeList,
) (*api.KubernetesClusterResources, error) {
	allCPUMillis, allMemoryBytes, allDiskBytes, err := kubeClient.GetAllClusterResources(
		ctx, clusterType, volumes,
	)
	if err != nil {
		return nil, errors.New("could not get cluster resources")
	}

	consumedCPUMillis, consumedMemoryBytes, err := kubeClient.GetConsumedCPUAndMemory(ctx, "")
	if err != nil {
		return nil, errors.New("could not get consumed cpu and memory")
	}

	consumedDiskBytes, err := kubeClient.GetConsumedDiskBytes(ctx, clusterType, volumes)
	if err != nil {
		return nil, errors.New("could not get consumed disk bytes")
	}

	availableCPUMillis := allCPUMillis - consumedCPUMillis
	// handle underflow
	if availableCPUMillis > allCPUMillis {
		availableCPUMillis = 0
	}
	availableMemoryBytes := allMemoryBytes - consumedMemoryBytes
	// handle underflow
	if availableMemoryBytes > allMemoryBytes {
		availableMemoryBytes = 0
	}
	availableDiskBytes := allDiskBytes - consumedDiskBytes
	// handle underflow
	if availableDiskBytes > allDiskBytes {
		availableDiskBytes = 0
	}

	res := &api.KubernetesClusterResources{
		Capacity: api.ResourcesCapacity{
			CpuMillis:   pointer.ToUint64OrNil(allCPUMillis),
			MemoryBytes: pointer.ToUint64OrNil(allMemoryBytes),
			DiskSize:    pointer.ToUint64OrNil(allDiskBytes),
		},
		Available: api.ResourcesAvailable{
			CpuMillis:   pointer.ToUint64OrNil(availableCPUMillis),
			MemoryBytes: pointer.ToUint64OrNil(availableMemoryBytes),
			DiskSize:    pointer.ToUint64OrNil(availableDiskBytes),
		},
	}

	return res, nil
}
