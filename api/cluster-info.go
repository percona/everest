package api

import (
	"net/http"
	"reflect"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	storagev1 "k8s.io/api/storage/v1"
)

const (
	annotationStorageClassDefault = "storageclass.kubernetes.io/is-default-class"
)

// GetKubernetesClusterInfo returns the cluster type and storage classes of a kubernetes cluster.
func (e *EverestServer) GetKubernetesClusterInfo(ctx echo.Context) error {
	clusterType, err := e.kubeClient.GetClusterType(ctx.Request().Context())
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString("Failed getting Kubernetes cluster provider")})
	}
	storagesList, err := e.kubeClient.GetStorageClasses(ctx.Request().Context())
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{Message: pointer.ToString("Failed getting storage classes")})
	}
	classNames := storageClasses(storagesList)

	return ctx.JSON(http.StatusOK, &KubernetesClusterInfo{ClusterType: string(clusterType), StorageClassNames: classNames})
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
