// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package api

import (
	"fmt"
	"net/http"

	"github.com/AlekSi/pointer"
	"github.com/labstack/echo/v4"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListBackupStorages lists backup storages.
func (e *EverestServer) ListBackupStorages(ctx echo.Context, namespace string) error {
	backupList, err := e.kubeClient.ListBackupStorages(ctx.Request().Context(), namespace)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Could not list backup storages"),
		})
	}

	result := make([]BackupStorage, 0, len(backupList.Items))
	for _, s := range backupList.Items {
		result = append(result, BackupStorage{
			Type:      BackupStorageType(s.Spec.Type),
			Name:      s.GetName(),
			Namespace: s.GetNamespace(),
			//nolint:exportloopref
			Description: &s.Spec.Description,
			BucketName:  s.Spec.Bucket,
			Region:      s.Spec.Region,
			//nolint:exportloopref
			Url:            &s.Spec.EndpointURL,
			VerifyTLS:      s.Spec.VerifyTLS,
			ForcePathStyle: s.Spec.ForcePathStyle,
		})
	}

	return ctx.JSON(http.StatusOK, result)
}

// CreateBackupStorage creates a new backup storage object.
func (e *EverestServer) CreateBackupStorage(ctx echo.Context, namespace string) error { //nolint:funlen
	c := ctx.Request().Context()
	existingStorages, err := e.kubeClient.ListBackupStorages(c, namespace)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed getting existing backup storages"),
		})
	}

	params, err := validateCreateBackupStorageRequest(ctx, e.l, existingStorages)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	s, err := e.kubeClient.GetBackupStorage(c, namespace, params.Name)
	if err != nil && !k8serrors.IsNotFound(err) {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed getting a backup storage from the Kubernetes cluster"),
		})
	}
	// TODO: Change the design of operator's structs so they return nil struct so
	// if s != nil passes
	if s != nil && s.Name != "" {
		return ctx.JSON(http.StatusConflict, Error{
			Message: pointer.ToString(fmt.Sprintf("Backup storage %s already exists in namespace %s", params.Name, namespace)),
		})
	}

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: namespace,
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: e.backupSecretData(params.SecretKey, params.AccessKey),
	}

	_, err = e.kubeClient.CreateSecret(c, secret)
	if err != nil {
		if k8serrors.IsAlreadyExists(err) {
			_, err = e.kubeClient.UpdateSecret(c, secret)
			if err != nil {
				e.l.Error(err)
				return ctx.JSON(http.StatusInternalServerError, Error{
					Message: pointer.ToString(fmt.Sprintf("Failed updating the secret %s for backup storage", params.Name)),
				})
			}
		} else {
			e.l.Error(err)
			return ctx.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString("Failed creating a secret for the backup storage"),
			})
		}
	}
	bs := &everestv1alpha1.BackupStorage{
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: namespace,
		},
		Spec: everestv1alpha1.BackupStorageSpec{
			Type:                  everestv1alpha1.BackupStorageType(params.Type),
			Bucket:                params.BucketName,
			Region:                params.Region,
			CredentialsSecretName: params.Name,
			AllowedNamespaces:     params.AllowedNamespaces,
			VerifyTLS:             params.VerifyTLS,
			ForcePathStyle:        params.ForcePathStyle,
		},
	}
	if params.Url != nil {
		bs.Spec.EndpointURL = *params.Url
	}
	if params.Description != nil {
		bs.Spec.Description = *params.Description
	}
	err = e.kubeClient.CreateBackupStorage(c, bs)
	if err != nil {
		e.l.Error(err)
		// TODO: Move this logic to the operator
		dErr := e.kubeClient.DeleteSecret(c, namespace, params.Name)
		if dErr != nil {
			return ctx.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString("Failed cleaning up secret for a backup storage"),
			})
		}
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed creating backup storage"),
		})
	}
	result := BackupStorage{
		Type:              BackupStorageType(params.Type),
		Name:              params.Name,
		Namespace:         namespace,
		Description:       params.Description,
		BucketName:        params.BucketName,
		Region:            params.Region,
		Url:               params.Url,
		AllowedNamespaces: params.AllowedNamespaces,
		VerifyTLS:         params.VerifyTLS,
		ForcePathStyle:    params.ForcePathStyle,
	}

	return ctx.JSON(http.StatusOK, result)
}

// DeleteBackupStorage deletes the specified backup storage.
func (e *EverestServer) DeleteBackupStorage(ctx echo.Context, name, namespace string) error {
	used, err := e.kubeClient.IsBackupStorageUsed(ctx.Request().Context(), namespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.JSON(http.StatusNotFound, Error{
				Message: pointer.ToString("Backup storage is not found"),
			})
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to check the backup storage is used"),
		})
	}
	if used {
		return ctx.JSON(http.StatusBadRequest, Error{
			Message: pointer.ToString(fmt.Sprintf("Backup storage %s is in use", name)),
		})
	}
	if err := e.kubeClient.DeleteBackupStorage(ctx.Request().Context(), namespace, name); err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.NoContent(http.StatusNoContent)
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to delete a backup storage"),
		})
	}
	if err := e.kubeClient.DeleteSecret(ctx.Request().Context(), namespace, name); err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.NoContent(http.StatusNoContent)
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed to delete a secret for backup storage"),
		})
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (e *EverestServer) backupSecretData(secretKey, accessKey string) map[string]string {
	return map[string]string{
		"AWS_SECRET_ACCESS_KEY": secretKey,
		"AWS_ACCESS_KEY_ID":     accessKey,
	}
}

// GetBackupStorage retrieves the specified backup storage.
func (e *EverestServer) GetBackupStorage(ctx echo.Context, name, namespace string) error {
	s, err := e.kubeClient.GetBackupStorage(ctx.Request().Context(), namespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.JSON(http.StatusNotFound, Error{
				Message: pointer.ToString("Backup storage is not found"),
			})
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed getting backup storage"),
		})
	}
	return ctx.JSON(http.StatusOK, BackupStorage{
		Type:              BackupStorageType(s.Spec.Type),
		Name:              s.GetName(),
		Namespace:         s.GetNamespace(),
		Description:       &s.Spec.Description,
		BucketName:        s.Spec.Bucket,
		Region:            s.Spec.Region,
		Url:               &s.Spec.EndpointURL,
		AllowedNamespaces: s.Spec.AllowedNamespaces,
		VerifyTLS:         s.Spec.VerifyTLS,
		ForcePathStyle:    s.Spec.ForcePathStyle,
	})
}

// UpdateBackupStorage updates of the specified backup storage.
func (e *EverestServer) UpdateBackupStorage(ctx echo.Context, name, namespace string) error { //nolint:funlen,cyclop
	c := ctx.Request().Context()
	bs, err := e.kubeClient.GetBackupStorage(c, namespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.JSON(http.StatusNotFound, Error{
				Message: pointer.ToString("Backup storage is not found"),
			})
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed getting backup storage"),
		})
	}

	secret, err := e.kubeClient.GetSecret(c, namespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return ctx.JSON(http.StatusNotFound, Error{
				Message: pointer.ToString("Secret is not found"),
			})
		}
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed getting secret"),
		})
	}

	params, err := e.validateUpdateBackupStorageRequest(ctx, bs, secret, e.l)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, Error{Message: pointer.ToString(err.Error())})
	}
	if params.AccessKey != nil && params.SecretKey != nil {
		_, err = e.kubeClient.UpdateSecret(c, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
			Type:       corev1.SecretTypeOpaque,
			StringData: e.backupSecretData(*params.SecretKey, *params.AccessKey),
		})
		if err != nil {
			e.l.Error(err)
			return ctx.JSON(http.StatusInternalServerError, Error{
				Message: pointer.ToString(fmt.Sprintf("Failed updating the secret %s", name)),
			})
		}
	}
	if params.BucketName != nil {
		bs.Spec.Bucket = *params.BucketName
	}
	if params.Region != nil {
		bs.Spec.Region = *params.Region
	}
	if params.Url != nil {
		bs.Spec.EndpointURL = *params.Url
	}
	if params.Description != nil {
		bs.Spec.Description = *params.Description
	}
	if params.AllowedNamespaces != nil {
		bs.Spec.AllowedNamespaces = *params.AllowedNamespaces
	}
	if params.VerifyTLS != nil {
		bs.Spec.VerifyTLS = params.VerifyTLS
	}
	if params.ForcePathStyle != nil {
		bs.Spec.ForcePathStyle = params.ForcePathStyle
	}

	err = e.kubeClient.UpdateBackupStorage(c, bs)
	if err != nil {
		e.l.Error(err)
		return ctx.JSON(http.StatusInternalServerError, Error{
			Message: pointer.ToString("Failed updating backup storage"),
		})
	}
	result := BackupStorage{
		Type:              BackupStorageType(bs.Spec.Type),
		Name:              bs.GetName(),
		Namespace:         bs.GetNamespace(),
		Description:       params.Description,
		BucketName:        bs.Spec.Bucket,
		Region:            bs.Spec.Region,
		Url:               &bs.Spec.EndpointURL,
		AllowedNamespaces: bs.Spec.AllowedNamespaces,
		VerifyTLS:         bs.Spec.VerifyTLS,
		ForcePathStyle:    bs.Spec.ForcePathStyle,
	}

	return ctx.JSON(http.StatusOK, result)
}
