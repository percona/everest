package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/percona/everest/pkg/common"
)

// UpdateEverestSettings accepts the full list of Everest settings and updates the settings.
func (k *Kubernetes) UpdateEverestSettings(ctx context.Context, settings common.EverestSettings) error {
	configMapData, err := settings.ToMap()
	if err != nil {
		return err
	}

	_, getErr := k.GetConfigMap(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestSettingsConfigMapName})
	if getErr != nil && !k8serrors.IsNotFound(getErr) {
		return getErr
	}

	c := &v1.ConfigMap{
		TypeMeta: metav1.TypeMeta{},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestSettingsConfigMapName,
			Namespace: common.SystemNamespace,
		},
		Data: configMapData,
	}
	if k8serrors.IsNotFound(getErr) {
		_, err = k.CreateConfigMap(ctx, c)
		return err
	}

	_, err = k.UpdateConfigMap(ctx, c)
	return err
}

// GetEverestSettings returns Everest settings.
func (k *Kubernetes) GetEverestSettings(ctx context.Context) (common.EverestSettings, error) {
	settings := common.EverestSettings{}
	m, err := k.GetConfigMap(ctx, types.NamespacedName{Namespace: common.SystemNamespace, Name: common.EverestSettingsConfigMapName})
	if err != nil {
		return settings, err
	}
	err = settings.FromMap(m.Data)
	return settings, err
}
